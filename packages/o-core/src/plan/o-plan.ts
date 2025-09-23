import { Logger, oAddress } from '../core/index.js';
import { oPlanConfig } from './interfaces/plan-config.interface.js';
import { CID } from 'multiformats';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';
import { AGENT_PROMPT } from './prompts/agent.prompt.js';
import { oPlanResult } from './interfaces/plan.result.js';
import { oToolError } from '../error/tool.error.js';
import { v4 as uuidv4 } from 'uuid';
import { RegexUtils } from '../utils/index.js';

export class oPlan {
  protected logger: Logger;
  public sequence: oPlan[] = [];
  public cid: CID | undefined;
  public id: string = uuidv4();
  public parentId: string | undefined;

  public result: oPlanResult | undefined;

  constructor(protected readonly config: oPlanConfig) {
    this.logger = new Logger('oPlan:' + `[${this.config.intent}]`);
    this.sequence = Object.assign([], this.config.sequence || []);
    this.parentId = this.config.parentId;
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
      sequence: this.sequence.map((s) => `o://plan/${s.cid?.toString()}`),
      result: this.result,
    };
  }

  addSequencePlan(plan: oPlan) {
    this.sequence.push(plan);
    if (this.config.streamTo) {
      this.node
        .use(this.config.streamTo, {
          method: 'receive_stream',
          params: {
            data: plan.result || '',
          },
        })
        .catch((error) => {
          this.logger.error('Error sending agent stream: ', error);
        });
    }
    // console.log(
    //   `${this.parentId ? '--[Child ' : '['}Cycle ${this.sequence.length} - ${this.id}]\n ${JSON.stringify(
    //     {
    //       ...plan.result,
    //     },
    //     null,
    //     2,
    //   )}\n${this.parentId ? '--[Child ' : '['}Cycle ${this.sequence.length} - ${this.id}]`,
    // );
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

  async storePlan() {
    this.logger.debug('Storing plan...');
    const cid = await this.toCID();

    const params = {
      key: cid.toString(),
      value: JSON.stringify(this.toJSON()),
    };
    this.logger.debug('Storing plan params: ', params);
    await this.node.use(new oAddress('o://plan'), {
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

  async searchPlans(): Promise<any> {
    this.logger.debug('Searching for plans...');
    const cid = await this.toCID();
    const response = await this.node.use(new oAddress('o://plan'), {
      method: 'get',
      params: {
        key: cid.toString(),
      },
    });
    this.logger.debug('Search plans response: ', response);

    const result = response.result;
    const json =
      typeof (result as any).data === 'string'
        ? JSON.parse((result as any).data)
        : (result as any).data;
    return json;
  }

  async preflight(): Promise<void> {
    this.logger.debug('Preflight...');
    this.cid = await this.toCID();
  }

  async run(): Promise<oPlanResult> {
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

    const response = await this.node.use(new oAddress('o://intelligence'), {
      method: 'prompt',
      params: {
        prompt: prompt,
        response_format: 'json_object',
      },
    });

    const data = response.result.data as any;
    this.logger.debug('Plan response: ', data);
    const message = data.message;
    if (!message) {
      throw new Error('No message returned from intelligence');
    }
    const planResult = RegexUtils.extractResultFromAI(message);
    return planResult;
  }

  async execute(): Promise<oPlanResult> {
    this.logger.debug('Executing...');
    await this.preflight();

    this.result = await this.run();
    return this.postflight(this.result);
  }

  async handleNetworkChanges(): Promise<void> {
    const cid = await this.toCID();
    await this.node.use(new oAddress('o://leader'), {
      method: 'save_plan',
      params: {
        plan: `o://plan/${cid}`,
      },
    });
  }

  async addReasoning(): Promise<void> {
    // if (this.result?.reasoning) {
    //   this.logger.debug('Adding knowledge: ', this.result?.reasoning);
    //   await this.node.use(new oAddress('o://vector-store'), {
    //     method: 'add_documents',
    //     params: {
    //       documents: [
    //         {
    //           pageContent: this.result?.reasoning,
    //           metadata: {
    //             address: this.caller?.toString(),
    //             id: uuidv4(),
    //           },
    //         },
    //       ],
    //     },
    //   });
    // }
  }

  async postflight(response: oPlanResult): Promise<oPlanResult> {
    this.logger.debug('Postflight...');
    try {
      await this.storePlan();
      this.logger.debug('Saving plan...', response);

      // TODO: handle network changes

      await this.addReasoning();
    } catch (error) {
      this.logger.error('Error in postflight: ', error);
    }
    return response;
  }
}
