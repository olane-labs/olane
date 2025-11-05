import { oAddress, oResponse } from '@olane/o-core';
import { oCapability } from '../capabilities/o-capability.js';
import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilitySearchConfig } from './interfaces/o-capability.search-config.js';
import { oCapabilitySearchResult } from './o-capability.search-result.js';
import { oCapabilityResult } from '../capabilities/o-capability.result.js';

export class oCapabilitySearch extends oCapability {
  public config!: oCapabilitySearchConfig;

  get type(): oCapabilityType {
    return oCapabilityType.SEARCH;
  }

  static get type() {
    return oCapabilityType.SEARCH;
  }

  get external(): boolean {
    return this.config.params.isExternal;
  }

  get queries(): { query: string; limit?: number }[] {
    return this.config.params.queries;
  }

  get explanation(): string {
    return this.config.params.explanation;
  }

  async doExternalSearch(query: string): Promise<string> {
    let message = '';
    await this.node.useStream(
      new oAddress('o://perplexity'),
      {
        method: 'completion',
        params: {
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content: query,
            },
          ],
        },
      },
      {
        onChunk: (chunk: oResponse) => {
          message += (chunk.result.data as any).delta;
          this.config.onChunk?.(oResponse.fromJSON(chunk));
        },
      },
    );
    return message;
  }

  /**
   * Search external providers.
   */
  private async externalSearch(): Promise<oCapabilitySearchResult> {
    const searchResults = [];
    for (const query of this.queries) {
      const searchResult = await this.doExternalSearch(query.query);
      searchResults.push(searchResult);
    }
    let searchResultContext = `[Search Results Begin]`;
    if (searchResults.length === 0) {
      searchResultContext += `No more search results found!\n\n`;
    }

    // update the context with the search results
    for (const searchResult of searchResults) {
      searchResultContext += `External Search Result: ${searchResult || 'unknown'}\n\n`;
    }

    searchResultContext += `[Search Results End]`;

    return new oCapabilitySearchResult({
      result: searchResultContext,
      type: oCapabilityType.EVALUATE,
      config: this.config,
    });
  }

  private async doInternalSearch(
    query: string,
    limit?: number,
  ): Promise<string> {
    const response = await this.node.use(new oAddress('o://search'), {
      method: 'vector',
      params: {
        query: query,
        limit: limit || 20,
      },
    });
    if (this.config.onChunk) {
      this.config.onChunk(response);
    }
    let searchResultContext = ``;
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
    return searchResultContext;
  }

  /**
   * Search internal providers such as the local vector store, local database, etc.
   */
  private async internalSearch(): Promise<oCapabilitySearchResult> {
    // find all tools that are search tools
    let searchResultContext = `[Search Results Begin]`;

    for (const query of this.queries) {
      const searchResult = await this.doInternalSearch(
        query.query,
        query.limit,
      );
      searchResultContext += searchResult;
    }

    searchResultContext += `[Search Results End]`;
    return new oCapabilitySearchResult({
      result: searchResultContext,
      type: oCapabilityType.EVALUATE,
      config: this.config,
    });
  }

  async run(): Promise<oCapabilityResult> {
    const result = this.external
      ? await this.externalSearch()
      : await this.internalSearch();

    return result;
  }
}
