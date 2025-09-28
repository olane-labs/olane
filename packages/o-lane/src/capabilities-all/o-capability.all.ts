import { oCapabilityConfigure } from '../capabilities-configure/o-capability.configure';
import { oCapabilityError } from '../capabilities-error/o-capability.error';
import { oCapabilityEvaluate } from '../capabilities-evaluate/o-capability.evaluate';
import { oCapabilityMultipleStep } from '../capabilities-multiple-step/o-capability.multiple-step';
import { oCapabilitySearch } from '../capabilities-search/o-capability.search';
import { oCapabilityTask } from '../capabilities-task/o-capability.task';

export const ALL_CAPABILITIES = [
  oCapabilityTask,
  oCapabilitySearch,
  oCapabilityEvaluate,
  oCapabilityMultipleStep,
  oCapabilityConfigure,
  oCapabilityError,
];
