import { oAddress } from '@olane/o-core';
import { oCapabilityResult } from '../capabilities/interfaces/o-capability.result-interface';
import { oCapability } from '../capabilities/o-capability';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum';
import { oCapabilitySearchConfig } from './interfaces/o-capability.search-config';
import { oCapabilitySearchResult } from './o-capability.search-result.js';

export class oCapabilitySearch extends oCapability {
  public config!: oCapabilitySearchConfig;

  get type(): oCapabilityType {
    return oCapabilityType.SEARCH;
  }

  static get type() {
    return oCapabilityType.SEARCH;
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
  private async externalSearch(): Promise<oCapabilitySearchResult> {
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

    let searchResultContext = `[Search Results Begin]`;

    const data = response.result.data as any;
    let filteredSearchResults = data.message;
    if (filteredSearchResults.length === 0) {
      searchResultContext += `No more search results found!\n\n`;
    }

    // update the context with the search results
    for (const searchResult of filteredSearchResults) {
      searchResultContext += `External Search Result: ${searchResult?.message || 'unknown'}\n\n`;
    }

    searchResultContext += `[Search Results End]`;

    return {
      result: searchResultContext,
      type: oCapabilityType.RESULT,
    };
  }

  /**
   * Search internal providers such as the local vector store, local database, etc.
   */
  private async internalSearch(): Promise<oCapabilitySearchResult> {
    // find all tools that are search tools
    const response = await this.node.use(new oAddress('o://search'), {
      method: 'vector',
      params: {
        query: this.query,
      },
    });
    let searchResultContext = `[Search Results Begin]`;

    const data = response.result.data as { metadata: any; pageContent: any }[];
    let filteredSearchResults = data;
    if (filteredSearchResults.length === 0) {
      searchResultContext += `No more search results found!\n\n`;
    }

    // update the context with the search results
    for (const searchResult of filteredSearchResults) {
      // internal search results
      if (searchResult?.metadata) {
        // add the context data
        searchResultContext += `Tool Address: ${searchResult?.metadata?.address || 'unknown'}\nTool Data: ${searchResult?.pageContent || 'unknown'}\n\n`;
      }
    }

    searchResultContext += `[Search Results End]`;
    return {
      result: searchResultContext,
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
