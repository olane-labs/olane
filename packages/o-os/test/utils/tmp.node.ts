import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress } from '@olane/o-node';
import { oLimitedTool } from '@olane/o-client-limited';

export const tmpNode = new oLimitedTool({
  address: new oNodeAddress('o://tmp-node'),
  leader: null,
  parent: null,
  description: 'temporary node',
});
