import { oAddress } from '../../core';
import { oNode } from '../node';

export class LocalSearch {
  static async search(node: oNode, query: string): Promise<oAddress> {
    const results = await node.myTools();
    // utilize local rag

    // utilize current tools to see if there is a match

    // utilize children tools to see if there is a match

    // nothing was found, try global search to remedy
    throw new Error('No tool found for query');
  }
}
