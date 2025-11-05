import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress } from '@olane/o-node';

export const tmpNode = new oLaneTool({
  address: new oNodeAddress('o://tmp-node'),
  leader: null,
  parent: null,
  description: 'temporary node',
});
