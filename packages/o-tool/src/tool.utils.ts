import { oResponse } from '@olane/o-core';
import { oRequest } from '@olane/o-protocol';

export class ToolUtils {
  static buildResponse(request: oRequest, result: any, error: any): oResponse {
    let success = true;
    if (error) {
      success = false;
    }
    return new oResponse({
      id: request.id,
      data: result,
      error: result?.error,
      ...{ success },
      _requestMethod: request.method,
      _connectionId: request.params?._connectionId,
    });
  }
}
