import { Logger, oAddress, oObject, RestrictedAddresses } from '@olane/o-core';
import { oLaneConfig } from './interfaces/o-lane.config.js';
import { CID } from 'multiformats';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';
import { AGENT_PROMPT } from './prompts/agent.prompt.js';
import { oLaneResult } from './interfaces/o-lane.result.js';
import { v4 as uuidv4 } from 'uuid';
import { RegexUtils } from '@olane/o-core';
import { oIntent } from './intent/index.js';
import { oIntentEncoder } from './intent-encoder/index.js';
import { oCapability } from './capabilities/o-capability.js';

export class oLane extends oObject {
  public sequence: oLane[] = [];
  public cid: CID | undefined;
  public id: string = uuidv4();
  public parentId: string | undefined;
  public intentEncoder: oIntentEncoder;

  public result: oLaneResult | undefined;

  constructor(protected readonly config: oLaneConfig) {
    super('o-lane:' + `[${config.intent}]`);
    this.sequence = Object.assign([], this.config.sequence || []);
    this.parentId = this.config.parentId;
    this.intentEncoder = new oIntentEncoder();
  }

  get intent(): oIntent {
    return this.config.intent;
  }

  toCIDInput(): any {
    return {
      intent: this.config.intent,
      address: this.config.caller?.toString(),
      context: this.config.context?.toString() || '',
    };
  }

  type() {
    return 'unknown';
  }

  toJSON() {
    return {
      config: this.toCIDInput(),
      sequence: this.sequence.map(
        (s) => `${RestrictedAddresses.LANE}/${s.cid?.toString()}`,
      ),
      result: this.result,
    };
  }

  addLane(plan: oLane) {
    this.sequence.push(plan);
    if (this.config.streamTo) {
      this.node
        .use(this.config.streamTo, {
          method: 'receive_stream',
          params: {
            data: plan.result || '',
          },
        })
        .catch((error: any) => {
          this.logger.error('Error sending agent stream: ', error);
        });
    }
  }

  async toCID(): Promise<CID> {
    if (this.cid) {
      return this.cid;
    }
    const bytes = json.encode(this.toCIDInput());
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, json.code, hash);
    return cid;
  }

  async store() {
    this.logger.debug('Storing plan...');
    const cid = await this.toCID();

    const params = {
      key: cid.toString(),
      value: JSON.stringify(this.toJSON()),
    };
    this.logger.debug('Storing plan params: ', params);
    await this.node.use(oAddress.lane(), {
      method: 'put',
      params: params,
    });
  }

  get agentHistory() {
    const added: { [key: string]: boolean } = {};
    return (
      this.sequence
        ?.filter((s) => {
          if (added[s.id]) {
            return false;
          }
          added[s.id] = true;
          return true;
        })
        ?.map(
          (s, index) =>
            `[Cycle ${index + 1} Begin ${s.id}]\n
            Cycle Intent: ${s.config.intent}\n
            Cycle Result:\n
            ${JSON.stringify(
              {
                ...s.result,
              },
              null,
              2,
            )} \n[Cycle ${index + 1} End ${s.id}]`,
        )
        .join('\n') || ''
    );
  }

  async preflight(): Promise<void> {
    this.logger.debug('Preflight...');
    this.cid = await this.toCID();
  }

  async run(): Promise<oLaneResult> {
    this.logger.debug('Running plan...');

    const ctxt = this.config.context?.toString() || '';
    let prompt: string | null = null;
    if (this.config.promptFunction) {
      this.logger.debug('Using prompt function: ', this.config.promptFunction);
      prompt = this.config.promptFunction(
        this.config.intent,
        ctxt,
        this.agentHistory,
        this.config.extraInstructions || '',
      );
    } else {
      prompt = AGENT_PROMPT(
        this.config.intent,
        ctxt,
        this.agentHistory,
        this.config.extraInstructions || '',
      );
    }
    // this.logger.debug('Prompt: ', prompt);

    const response = await this.node.use(
      new oAddress(RestrictedAddresses.INTELLIGENCE),
      {
        method: 'prompt',
        params: {
          prompt: prompt,
        },
      },
    );

    const data = response.result.data as any;
    const message = data.message;
    if (!message) {
      throw new Error('No message returned from intelligence');
    }
    const planResult = RegexUtils.extractResultFromAI(message);
    return planResult;
  }

  async execute(): Promise<oLaneResult> {
    this.logger.debug('Executing...');
    await this.preflight();

    this.result = await this.run();
    return this.postflight(this.result);
  }

  async doTask(task: oTaskConfig, config: oLaneConfig): Promise<oLaneResult> {
    this.logger.debug('Doing task...', task);
    const taskPlan = new oLaneUse({
      ...config,
      intent: this.config.intent,
      context: this.config.context,
      receiver: new oAddress(task.address),
      sequence: this.sequence,
    });
    const taskResult = await taskPlan.execute();
    this.addLane(taskPlan);
    this.logger.debug('Pushed task plan to sequence: ', taskResult.result);
    if (taskResult.error) {
      this.logger.debug('Task error: ', taskResult.error);
      // const errorResult = await this.handleError(taskResult.error, config);
      // if (errorResult.type === 'result') {
      //   return errorResult;
      // }
      // return this.doTask(task, config);
    }
    return taskResult;
  }

  async handleTasks(
    results: oLaneResult,
    config: oLaneConfig,
  ): Promise<oPlanResult[]> {
    this.logger.debug('Handling task...', results);
    const tasks = results.tasks;
    if (!tasks) {
      throw new Error('Invalid task passed to handleTask');
    }
    const taskResults: oLaneResult[] = [];
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
    queries: oLaneQueryConfig[],
    config: oLaneConfig,
  ): Promise<any[]> {
    this.logger.debug('Handling searches...', queries);
    if (queries.length === 0) {
      throw new Error('No queries provided to handleSearch');
    }
    const results: oLaneResult[] = [];
    for (const query of queries) {
      const searchPlan = new oSearchPlan({
        ...config,
        intent: `Searching for context to help with the user intent`,
        query: query?.query,
        external: query?.provider === 'external',
      });
      const result = await searchPlan.execute();
      this.addLane(searchPlan);
      this.logger.debug('Search result: ', result.result);
      results.push(result.result);
    }
    return results.flat();
  }

  // async handleError(error: any, config: oPlanConfig): Promise<oPlanResult> {
  //   this.logger.debug('Handling error...', error);
  //   const errorPlan = new oAgentPlan({
  //     ...config,
  //     intent: `If this error is already indicating that the user intent is solved, return a result otherwise solve it. The error is: ${error}`,
  //     context: this.config.context,
  //     sequence: this.sequence,
  //     parentId: this.id,
  //   });
  //   const result = await errorPlan.execute();
  //   this.addSequencePlan(errorPlan);
  //   return result;
  // }

  /**
   * The analysis of the intent results in a list of steps and queries to complete the intent.
   */
  async handleMultipleStep(output: oLaneResult): Promise<oLaneResult> {
    const results: any[] = [];
    for (const intent of output?.intents || []) {
      const subPlan = new oLaneAgent({
        ...this.config,
        intent: intent,
        sequence: this.sequence,
        parentId: this.id,
      });
      const response = await subPlan.execute();
      this.addLane(subPlan);
      results.push(JSON.stringify(response));
    }
    return {
      result: results,
      type: 'multiple_step',
    };
  }

  async loop(): Promise<oLaneResult> {
    if (!this.node) {
      throw new Error('Node not set');
    }

    let iterations = 0;
    while (iterations++ < this.MAX_ITERATIONS) {
      this.logger.debug(
        'Plan context size: ',
        this.config.context?.toString()?.length,
      );

      if (this.config.shouldContinue && !this.config.shouldContinue()) {
        throw new Error('Cancelled');
      }

      // setup the plan config
      const planConfig: oLaneConfig = {
        ...this.config,
        currentNode: this.node,
        caller: this.node?.address,
        sequence: this.sequence,
      };

      // search or resolve the intent with tool usage
      const plan = new oLane(planConfig);
      const response = await plan.execute();

      // all plans are wrappers of AI around current state
      const planResult = response as oLaneResult;
      const { error, result, type } = planResult;

      // update the sequence to reflect state change
      this.addLane(plan);

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
        const filteredSearchResults = searchResults;

        let searchResultContext = `[Search Results Begin]`;

        if (filteredSearchResults.length === 0) {
          searchResultContext += `No more search results found!\n\n`;
        }

        // update the context with the search results
        for (const searchResult of filteredSearchResults) {
          // internal search results
          if (searchResult?.metadata) {
            // add the context data
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

  async postflight(response: oLaneResult): Promise<oLaneResult> {
    this.logger.debug('Postflight...');
    try {
      await this.store();
      this.logger.debug('Saving plan...', response);
    } catch (error) {
      this.logger.error('Error in postflight: ', error);
    }
    return response;
  }

  get caller() {
    return this.config.caller;
  }

  get receiver() {
    return this.config.receiver;
  }

  get node() {
    return this.config.currentNode;
  }
}
