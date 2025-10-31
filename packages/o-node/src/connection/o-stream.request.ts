import { Request, RequestId } from '@olane/o-protocol';
import { oRequest } from '@olane/o-core';
import { Stream } from '@olane/o-config';

export class oStreamRequest extends oRequest {
  stream: Stream;
  constructor(config: Request & { id: RequestId; stream: Stream }) {
    super(config);
    this.stream = config.stream;
  }
}
