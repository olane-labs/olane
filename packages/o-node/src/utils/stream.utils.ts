import { Stream } from '@olane/o-config';
import { CoreUtils, oObject, oRequest, oResponse } from '@olane/o-core';

export class StreamUtils extends oObject {
  public static async processGenerator(
    request: oRequest,
    generator: AsyncGenerator<any>,
    stream: Stream,
  ): Promise<any> {
    const utils = new StreamUtils();
    for await (const result of generator) {
      await CoreUtils.sendStreamResponse(
        new oResponse({
          id: request.id,
          data: result,
          _last: false,
          _requestMethod: request.method,
          _connectionId: request.params?._connectionId,
        }),
        stream,
      );
    }
    await CoreUtils.sendStreamResponse(
      new oResponse({
        id: request.id,
        _last: true,
        _requestMethod: request.method,
        _connectionId: request.params?._connectionId,
      }),
      stream,
    );
    return Promise.resolve({
      success: true,
      response: 'Stream started',
    });
  }
}
