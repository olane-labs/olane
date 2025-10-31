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

    try {
      // Send each chunk from the generator
      for await (const result of generator) {
        const chunkResponse = await responseBuilder.buildChunk(request, result);
        await CoreUtils.sendStreamResponse(chunkResponse, stream);
      }

      // Send final chunk
      const finalResponse = await responseBuilder.buildFinalChunk(request);
      await CoreUtils.sendStreamResponse(finalResponse, stream);

      return Promise.resolve({
        success: true,
        response: 'Stream completed',
      });
    } catch (error: any) {
      // If error occurs during streaming, send error response
      const errorResponse = await responseBuilder.buildError(request, error, {
        isStream: true,
        isLast: true,
      });
      await CoreUtils.sendStreamResponse(errorResponse, stream);
      throw error;
    }
  }
}
