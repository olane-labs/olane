import { Logger, oAddress, oCoreNode, oResponse } from '../core';
import { oPlanResult } from './interfaces/plan.result';
import { oPlanConfig } from './interfaces/plan-config.interface';
import { oPlan } from './o-plan';
import { oUsePlan } from './use/use.plan';
import { oSearchPlan } from './search/search.plan';
import { oPlanContext } from './plan.context';
import { oQueryConfig } from './interfaces/query.config';
import { oErrorPlan } from './error/error.plan';

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
  private contextIdHash = {};

  constructor(config: oPlanConfig) {
    super(config);
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
      const taskPlan = new oUsePlan({
        ...config,
        intent: this.config.intent,
        context: this.config.context,
        receiver: new oAddress(task.address),
      });
      const taskResult = await taskPlan.execute();
      this.sequence.push(taskPlan);
      this.logger.debug('Pushed task plan to sequence: ', taskPlan.result);
      taskResults.push(taskResult);
      await this.handleError(taskResult.error, config);
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
        query: query.query,
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
    const errorPlan = new oErrorPlan({
      ...config,
      error: error,
    });
    this.sequence.push(errorPlan);
    const result = await errorPlan.execute();
    return result;
  }

  /**
   * The analysis of the intent results in a list of steps and queries to complete the intent.
   */
  // async handleMultipleStep(
  //   output: oPlanResult,
  //   config: oPlanConfig,
  //   node: oCoreNode,
  // ): Promise<oPlanResult> {
  //   this.logger.debug('Handling analysis...', output);
  //   let pastContext = config.context;
  //   const results: any[] = [];
  //   for (const intent of output?.intents || []) {
  //     const response: oPlanResult = await this.start();
  //     if (!response.result) {
  //       throw new Error('No result found for intent: ' + intent.intent);
  //     }
  //     this.logger.debug(
  //       'Handled multiple step intent: ',
  //       intent.intent,
  //       response,
  //     );
  //     pastContext?.addAll(response.result);
  //     results.push(response.result);
  //   }
  //   return {
  //     result: results,
  //     type: 'multiple_step',
  //   };
  // }

  async loop(): Promise<oPlanResult> {
    if (!this.node) {
      throw new Error('Node not set');
    }

    let iterations = 0;
    while (iterations++ < this.MAX_ITERATIONS) {
      this.logger.debug('Plan context: ', this.config.context);

      // setup the plan config
      const planConfig: oPlanConfig = {
        intent: this.config.intent as string,
        currentNode: this.node,
        caller: this.node?.address,
        context: this.config.context,
        sequence: this.sequence,
      };

      // search or resolve the intent with tool usage
      const plan = new oPlan(planConfig);
      const result = await plan.execute();

      // all plans are wrappers of AI around current state
      const { message } = result as any;
      const matches = message.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (!matches || matches.length === 0) {
        // AI failed to return a valid JSON object
        throw new Error('AI failed to return a valid JSON object');
      }

      const json = matches[0];

      this.logger.debug('[AGENT PLAN] Analysis result: ', json);

      // process the result and react
      const planResult = JSON.parse(json) as oPlanResult;

      // update the sequence to reflect state change
      this.sequence.push(plan);

      // handle the various result types
      const resultType = planResult.type;

      // if there is an answer, return it
      if (
        resultType === 'result' ||
        resultType === 'error' ||
        resultType === 'handshake'
      ) {
        return planResult;
      }
      // if there are intents, handle them
      if (resultType === 'multiple_step') {
        this.logger.error('Multiple step not implemented');
        throw new Error('Multiple step not implemented');
        // return this.handleMultipleStep(planResult, planConfig, this.node);
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
          // add the context data
          this.contextIdHash[searchResult.metadata.id] = true;
          searchResultContext += `Tool Address: ${searchResult.metadata.address}\nTool Data: ${searchResult.pageContent}\n\n`;
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
