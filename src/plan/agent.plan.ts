import { Logger, oAddress, oCoreNode, oResponse } from '../core/index.js';
import { oPlanResult } from './interfaces/plan.result.js';
import { oPlanConfig } from './interfaces/plan-config.interface.js';
import { oPlan } from './o-plan.js';
import { oUsePlan } from './use/use.plan.js';
import { oSearchPlan } from './search/search.plan.js';
import { oQueryConfig } from './interfaces/query.config.js';
import { oTaskConfig } from './interfaces/task.config.js';

/**
 * oAgentPlan is responsible for managing the execution of plans.
 * General execution flow:
 * 1. Analyze intent
 * 2. Search for context
 * 3. Use network tools + context to solve intent
 * 4. Back to step 1
 */
export class oAgentPlan extends oPlan {
  private MAX_ITERATIONS = 20;
  private contextIdHash: { [key: string]: boolean } = {};

  constructor(config: oPlanConfig) {
    super(config);
  }

  async doTask(task: oTaskConfig, config: oPlanConfig): Promise<oPlanResult> {
    this.logger.debug('Doing task...');
    const taskPlan = new oUsePlan({
      ...config,
      intent: this.config.intent,
      context: this.config.context,
      receiver: new oAddress(task.address),
      sequence: this.sequence,
      promptFunction: undefined,
    });
    const taskResult = await taskPlan.execute();
    this.sequence.push(taskPlan);
    this.logger.debug('Pushed task plan to sequence: ', taskResult.result);
    if (taskResult.error) {
      this.logger.debug('Task error: ', taskResult.error);
      const errorResult = await this.handleError(taskResult.error, config);
      if (errorResult.type === 'result') {
        return errorResult;
      }
      return this.doTask(task, config);
    }
    return taskResult;
  }

  async handleTasks(
    results: oPlanResult,
    config: oPlanConfig,
  ): Promise<oPlanResult[]> {
    this.logger.debug('Handling task...', results);
    const tasks = results.tasks;
    if (!tasks) {
      throw new Error('Invalid task passed to handleTask');
    }
    const taskResults: oPlanResult[] = [];
    for (const task of tasks) {
      if (!task.address) {
        throw new Error('Invalid address passed to handleTask');
      }

      // perform task if necessary
      const result = await this.doTask(task, config);
      taskResults.push(result);
    }
    return taskResults;
  }

  async handleSearch(
    queries: oQueryConfig[],
    config: oPlanConfig,
  ): Promise<any[]> {
    this.logger.debug('Handling searches...', queries);
    if (queries.length === 0) {
      throw new Error('No queries provided to handleSearch');
    }
    const results: oPlanResult[] = [];
    for (const query of queries) {
      const searchPlan = new oSearchPlan({
        ...config,
        intent: `Searching for context to help with the user intent`,
        query: query?.query,
        external: query?.provider === 'external',
      });
      const result = await searchPlan.execute();
      this.sequence.push(searchPlan);
      this.logger.debug('Search result: ', result.result);
      results.push(result.result);
    }
    return results.flat();
  }

  async handleError(error: any, config: oPlanConfig): Promise<oPlanResult> {
    this.logger.debug('Handling error...', error);
    const errorPlan = new oAgentPlan({
      ...config,
      intent: `If this error is already indicating that the user intent is solved, return a result otherwise solve it. The error is: ${error}`,
      context: this.config.context,
      sequence: this.sequence,
      promptFunction: undefined,
    });
    const result = await errorPlan.execute();
    this.sequence.push(errorPlan);
    return result;
  }

  /**
   * The analysis of the intent results in a list of steps and queries to complete the intent.
   */
  async handleMultipleStep(output: oPlanResult): Promise<oPlanResult> {
    this.logger.debug('Handling analysis...', output);
    const results: any[] = [];
    for (const intent of output?.intents || []) {
      const subPlan = new oAgentPlan({
        ...this.config,
        intent: intent,
        sequence: this.sequence,
        promptFunction: undefined,
      });
      const response = await subPlan.execute();
      this.sequence.push(subPlan);
      this.logger.debug('Handled multiple step intent: ', intent, response);
      results.push(JSON.stringify(response));
    }
    return {
      result: results,
      type: 'multiple_step',
    };
  }

  async loop(): Promise<oPlanResult> {
    if (!this.node) {
      throw new Error('Node not set');
    }

    let iterations = 0;
    while (iterations++ < this.MAX_ITERATIONS) {
      this.logger.debug(
        'Plan context size: ',
        this.config.context?.toString()?.length,
      );

      // setup the plan config
      const planConfig: oPlanConfig = {
        intent: this.config.intent as string,
        currentNode: this.node,
        caller: this.node?.address,
        context: this.config.context,
        sequence: this.sequence,
        promptFunction: this.config.promptFunction,
      };

      // search or resolve the intent with tool usage
      const plan = new oPlan(planConfig);
      const response = await plan.execute();

      // all plans are wrappers of AI around current state
      const planResult = response as oPlanResult;
      const { error, result, type } = planResult;

      // update the sequence to reflect state change
      this.sequence.push(plan);

      // handle the various result types
      const resultType = type;

      // if there is an answer, return it
      if (
        resultType === 'result' ||
        resultType === 'error' ||
        resultType === 'handshake' ||
        resultType === 'configure'
      ) {
        return planResult;
      }
      // if there are intents, handle them
      if (resultType === 'multiple_step') {
        this.logger.debug('Handling multiple step...', planResult);
        const multipleStepResult = await this.handleMultipleStep(planResult);
        this.config.context?.add(JSON.stringify(multipleStepResult));
      }

      // handle search case
      if (resultType === 'search' && planResult.queries) {
        const searchResults = await this.handleSearch(
          planResult.queries,
          planConfig,
        );
        const filteredSearchResults = searchResults.filter(
          (result) => !this.contextIdHash[result?.metadata?.id],
        );

        let searchResultContext = `[Search Results Begin]`;

        if (filteredSearchResults.length === 0) {
          searchResultContext += `No more search results found!\n\n`;
        }

        // update the context with the search results
        for (const searchResult of filteredSearchResults) {
          // internal search results
          if (searchResult?.metadata) {
            // add the context data
            this.contextIdHash[searchResult?.metadata?.id || '0'] = true;
            searchResultContext += `Tool Address: ${searchResult?.metadata?.address || 'unknown'}\nTool Data: ${searchResult?.pageContent || 'unknown'}\n\n`;
          } else {
            searchResultContext += `External Search Result: ${searchResult?.message || 'unknown'}\n\n`;
          }
        }

        searchResultContext += `[Search Results End]`;

        if (filteredSearchResults.length > 0) {
          this.config.context?.add(searchResultContext);
        }
      }

      // if there is a task required, handle it
      if (resultType === 'task') {
        await this.handleTasks(planResult, planConfig);
      }
    }
    throw new Error('Plan failed, reached max iterations');
  }

  async run(): Promise<oPlanResult> {
    return await this.loop();
  }
}
