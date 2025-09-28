import { oAddress } from '@olane/o-core';
import { oCapabilityResult } from '../capabilities/interfaces/o-capability.result';
import { oCapability } from '../capabilities/o-capability';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum';
import { oCapabilitySearchConfig } from './interfaces/o-capability.search-config';

export class oCapabilitySearch extends oCapability {
  constructor(readonly config: oCapabilitySearchConfig) {
    super(config);
  }

  get query(): string {
    return this.config.query;
  }

  get explanation(): string {
    return this.config.explanation;
  }

  get external(): boolean {
    return this.config.external;
  }

  /**
   * Search external providers.
   */
  private async externalSearch(): Promise<oCapabilityResult> {
    const response = await this.node.use(new oAddress('o://perplexity'), {
      method: 'completion',
      params: {
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: this.query,
          },
        ],
      },
    });
    this.logger.debug('External search response: ', response.result.data);

    return {
      result: [response.result.data],
      type: oCapabilityType.RESULT,
    };
  }

  /**
   * Search internal providers such as the local vector store, local database, etc.
   */
  private async internalSearch(): Promise<oCapabilityResult> {
    // find all tools that are search tools
    const response = await this.node.use(new oAddress('o://search'), {
      method: 'vector',
      params: {
        query: this.query,
      },
    });
    return {
      result: response.result.data,
      type: oCapabilityType.RESULT,
    };
  }

  async run(): Promise<oCapabilityResult> {
    const result = this.external
      ? await this.externalSearch()
      : await this.internalSearch();

    return result;
  }
}
