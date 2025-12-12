import { Stream } from '@olane/o-config';
import {
  CoreUtils,
  oObject,
  oRequest,
  oResponse,
  ResponseBuilder,
} from '@olane/o-core';

export class StreamUtils extends oObject {
  public static async processGenerator(
    request: oRequest,
    generator: AsyncGenerator<any>,
    stream: Stream,
  ): Promise<any> {
    const utils = new StreamUtils();
    const responseBuilder = ResponseBuilder.create();
    let aggregatedResult = '';

    try {
      // Send each chunk from the generator
      // result should not be an oResponse, but rather a key value pair dict
      for await (const result of generator) {
        if (result.delta) {
          aggregatedResult += result.delta;
        }
        const chunkResponse = await responseBuilder.buildChunk(request, result);
        await CoreUtils.sendResponseLP(chunkResponse, stream);
      }

      return {
        message: aggregatedResult,
      };
    } catch (error: any) {
      // If error occurs during streaming, send error response
      const errorResponse = await responseBuilder.buildError(request, error, {
        isStream: true,
        isLast: true,
      });
      await CoreUtils.sendResponseLP(errorResponse, stream);
      throw error;
    }
  }
}
