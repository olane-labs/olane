import { oCapabilityConfigure } from '../capabilities-configure/o-capability.configure.js';
import { oCapabilityEvaluate } from '../capabilities-evaluate/o-capability.evaluate.js';
import { oCapabilityMultipleStep } from '../capabilities-multiple-step/o-capability.multiple-step.js';
import { oCapabilitySearch } from '../capabilities-search/o-capability.search.js';
import { oCapabilityTask } from '../capabilities-task/o-capability.task.js';

export const ALL_CAPABILITIES = [
  oCapabilityTask,
  oCapabilitySearch,
  oCapabilityEvaluate,
  oCapabilityMultipleStep,
  oCapabilityConfigure,
];
