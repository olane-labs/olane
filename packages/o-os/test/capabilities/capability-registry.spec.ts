import { expect } from 'chai';
import {
  ALL_CAPABILITIES,
  oCapabilityTask,
  oCapabilitySearch,
  oCapabilityEvaluate,
  oCapabilityMultipleStep,
  oCapabilityConfigure,
  oCapabilityType
} from '@olane/o-lane';

describe('Capability Registry @capability @registry', () => {
  describe('ALL_CAPABILITIES array', () => {
    it('should export ALL_CAPABILITIES array', () => {
      expect(ALL_CAPABILITIES).to.exist;
      expect(ALL_CAPABILITIES).to.be.an('array');
    });

    it('should contain all capability classes', () => {
      expect(ALL_CAPABILITIES.length).to.be.greaterThan(0);
    });

    it('should include oCapabilityTask', () => {
      expect(ALL_CAPABILITIES).to.include(oCapabilityTask);
    });

    it('should include oCapabilitySearch', () => {
      expect(ALL_CAPABILITIES).to.include(oCapabilitySearch);
    });

    it('should include oCapabilityEvaluate', () => {
      expect(ALL_CAPABILITIES).to.include(oCapabilityEvaluate);
    });

    it('should include oCapabilityMultipleStep', () => {
      expect(ALL_CAPABILITIES).to.include(oCapabilityMultipleStep);
    });

    it('should include oCapabilityConfigure', () => {
      expect(ALL_CAPABILITIES).to.include(oCapabilityConfigure);
    });

    it('should have exactly 5 capabilities', () => {
      expect(ALL_CAPABILITIES.length).to.equal(5);
    });
  });

  describe('Capability class registration', () => {
    it('should allow instantiation of oCapabilityTask', () => {
      const capability = new oCapabilityTask();
      expect(capability).to.exist;
      expect(capability.type).to.equal(oCapabilityType.TASK);
    });

    it('should allow instantiation of oCapabilitySearch', () => {
      const capability = new oCapabilitySearch();
      expect(capability).to.exist;
      expect(capability.type).to.equal(oCapabilityType.SEARCH);
    });

    it('should allow instantiation of oCapabilityEvaluate', () => {
      const capability = new oCapabilityEvaluate();
      expect(capability).to.exist;
      expect(capability.type).to.equal(oCapabilityType.EVALUATE);
    });

    it('should allow instantiation of oCapabilityMultipleStep', () => {
      const capability = new oCapabilityMultipleStep();
      expect(capability).to.exist;
      expect(capability.type).to.equal(oCapabilityType.MULTIPLE_STEP);
    });

    it('should allow instantiation of oCapabilityConfigure', () => {
      const capability = new oCapabilityConfigure();
      expect(capability).to.exist;
      expect(capability.type).to.equal(oCapabilityType.CONFIGURE);
    });
  });

  describe('Capability type mapping', () => {
    it('should map each capability to its type', () => {
      const typeMap = new Map<any, oCapabilityType>([
        [oCapabilityTask, oCapabilityType.TASK],
        [oCapabilitySearch, oCapabilityType.SEARCH],
        [oCapabilityEvaluate, oCapabilityType.EVALUATE],
        [oCapabilityMultipleStep, oCapabilityType.MULTIPLE_STEP],
        [oCapabilityConfigure, oCapabilityType.CONFIGURE]
      ]);

      ALL_CAPABILITIES.forEach(CapabilityClass => {
        const expectedType = typeMap.get(CapabilityClass);
        expect(CapabilityClass.type).to.equal(expectedType);
      });
    });

    it('should have unique types for each capability', () => {
      const types = ALL_CAPABILITIES.map(Cap => Cap.type);
      const uniqueTypes = new Set(types);

      expect(uniqueTypes.size).to.equal(ALL_CAPABILITIES.length);
    });

    it('should use static type getter', () => {
      ALL_CAPABILITIES.forEach(CapabilityClass => {
        expect(CapabilityClass.type).to.exist;
        expect(CapabilityClass.type).to.be.a('string');
      });
    });

    it('should match instance type with static type', () => {
      ALL_CAPABILITIES.forEach(CapabilityClass => {
        const instance = new CapabilityClass();
        expect(instance.type).to.equal(CapabilityClass.type);
      });
    });
  });

  describe('Capability type enumeration', () => {
    it('should define TASK type', () => {
      expect(oCapabilityType.TASK).to.exist;
      expect(oCapabilityType.TASK).to.be.a('string');
    });

    it('should define SEARCH type', () => {
      expect(oCapabilityType.SEARCH).to.exist;
      expect(oCapabilityType.SEARCH).to.be.a('string');
    });

    it('should define MULTIPLE_STEP type', () => {
      expect(oCapabilityType.MULTIPLE_STEP).to.exist;
      expect(oCapabilityType.MULTIPLE_STEP).to.be.a('string');
    });

    it('should define CONFIGURE type', () => {
      expect(oCapabilityType.CONFIGURE).to.exist;
      expect(oCapabilityType.CONFIGURE).to.be.a('string');
    });

    it('should define HANDSHAKE type', () => {
      expect(oCapabilityType.HANDSHAKE).to.exist;
      expect(oCapabilityType.HANDSHAKE).to.be.a('string');
    });

    it('should define EVALUATE type', () => {
      expect(oCapabilityType.EVALUATE).to.exist;
      expect(oCapabilityType.EVALUATE).to.be.a('string');
    });

    it('should define STOP type', () => {
      expect(oCapabilityType.STOP).to.exist;
      expect(oCapabilityType.STOP).to.be.a('string');
    });

    it('should define ERROR type', () => {
      expect(oCapabilityType.ERROR).to.exist;
      expect(oCapabilityType.ERROR).to.be.a('string');
    });

    it('should define UNKNOWN type', () => {
      expect(oCapabilityType.UNKNOWN).to.exist;
      expect(oCapabilityType.UNKNOWN).to.be.a('string');
    });
  });

  describe('Capability discovery', () => {
    it('should find capability by type', () => {
      const findByType = (type: oCapabilityType) => {
        return ALL_CAPABILITIES.find(Cap => Cap.type === type);
      };

      const taskCap = findByType(oCapabilityType.TASK);
      expect(taskCap).to.equal(oCapabilityTask);

      const searchCap = findByType(oCapabilityType.SEARCH);
      expect(searchCap).to.equal(oCapabilitySearch);

      const evaluateCap = findByType(oCapabilityType.EVALUATE);
      expect(evaluateCap).to.equal(oCapabilityEvaluate);

      const multiStepCap = findByType(oCapabilityType.MULTIPLE_STEP);
      expect(multiStepCap).to.equal(oCapabilityMultipleStep);

      const configureCap = findByType(oCapabilityType.CONFIGURE);
      expect(configureCap).to.equal(oCapabilityConfigure);
    });

    it('should return undefined for unregistered type', () => {
      const findByType = (type: oCapabilityType) => {
        return ALL_CAPABILITIES.find(Cap => Cap.type === type);
      };

      const unknownCap = findByType(oCapabilityType.HANDSHAKE);
      expect(unknownCap).to.be.undefined;
    });

    it('should list all registered capability types', () => {
      const registeredTypes = ALL_CAPABILITIES.map(Cap => Cap.type);

      expect(registeredTypes).to.include(oCapabilityType.TASK);
      expect(registeredTypes).to.include(oCapabilityType.SEARCH);
      expect(registeredTypes).to.include(oCapabilityType.EVALUATE);
      expect(registeredTypes).to.include(oCapabilityType.MULTIPLE_STEP);
      expect(registeredTypes).to.include(oCapabilityType.CONFIGURE);
    });
  });

  describe('Capability order', () => {
    it('should maintain consistent order', () => {
      const expectedOrder = [
        oCapabilityTask,
        oCapabilitySearch,
        oCapabilityEvaluate,
        oCapabilityMultipleStep,
        oCapabilityConfigure
      ];

      expect(ALL_CAPABILITIES).to.deep.equal(expectedOrder);
    });

    it('should have TASK as first capability', () => {
      expect(ALL_CAPABILITIES[0]).to.equal(oCapabilityTask);
    });

    it('should have CONFIGURE as last capability', () => {
      expect(ALL_CAPABILITIES[ALL_CAPABILITIES.length - 1]).to.equal(oCapabilityConfigure);
    });
  });

  describe('Capability interface compliance', () => {
    it('should have execute method on all capabilities', () => {
      ALL_CAPABILITIES.forEach(CapabilityClass => {
        const instance = new CapabilityClass();
        expect(instance.execute).to.be.a('function');
      });
    });

    it('should have run method on all capabilities', () => {
      ALL_CAPABILITIES.forEach(CapabilityClass => {
        const instance = new CapabilityClass();
        expect(instance.run).to.be.a('function');
      });
    });

    it('should have type getter on all capabilities', () => {
      ALL_CAPABILITIES.forEach(CapabilityClass => {
        const instance = new CapabilityClass();
        expect(instance.type).to.exist;
      });
    });

    it('should have cancel method on all capabilities', () => {
      ALL_CAPABILITIES.forEach(CapabilityClass => {
        const instance = new CapabilityClass();
        expect(instance.cancel).to.be.a('function');
      });
    });
  });

  describe('Capability extensibility', () => {
    it('should allow extending capabilities array', () => {
      const extendedCapabilities = [...ALL_CAPABILITIES];

      expect(extendedCapabilities.length).to.equal(ALL_CAPABILITIES.length);
      expect(extendedCapabilities).to.deep.equal(ALL_CAPABILITIES);
    });

    it('should allow filtering capabilities', () => {
      const intelligenceCapabilities = ALL_CAPABILITIES.filter(CapabilityClass => {
        const instance = new CapabilityClass();
        return 'intelligence' in instance;
      });

      // Configure, Evaluate, and MultipleStep extend oCapabilityIntelligence
      expect(intelligenceCapabilities.length).to.be.greaterThan(0);
    });

    it('should allow mapping capabilities', () => {
      const capabilityInfo = ALL_CAPABILITIES.map(CapabilityClass => ({
        type: CapabilityClass.type,
        name: CapabilityClass.name
      }));

      expect(capabilityInfo.length).to.equal(ALL_CAPABILITIES.length);
      expect(capabilityInfo[0].type).to.equal(oCapabilityType.TASK);
    });
  });

  describe('Capability metadata', () => {
    it('should have class names', () => {
      expect(oCapabilityTask.name).to.equal('oCapabilityTask');
      expect(oCapabilitySearch.name).to.equal('oCapabilitySearch');
      expect(oCapabilityEvaluate.name).to.equal('oCapabilityEvaluate');
      expect(oCapabilityMultipleStep.name).to.equal('oCapabilityMultipleStep');
      expect(oCapabilityConfigure.name).to.equal('oCapabilityConfigure');
    });

    it('should be constructable', () => {
      ALL_CAPABILITIES.forEach(CapabilityClass => {
        expect(() => new CapabilityClass()).to.not.throw();
      });
    });

    it('should have prototype methods', () => {
      ALL_CAPABILITIES.forEach(CapabilityClass => {
        expect(CapabilityClass.prototype.execute).to.exist;
        expect(CapabilityClass.prototype.run).to.exist;
        expect(CapabilityClass.prototype.cancel).to.exist;
      });
    });
  });

  describe('Registry immutability', () => {
    it('should not modify original array when extended', () => {
      const originalLength = ALL_CAPABILITIES.length;
      const extended = [...ALL_CAPABILITIES, oCapabilityTask];

      expect(ALL_CAPABILITIES.length).to.equal(originalLength);
      expect(extended.length).to.equal(originalLength + 1);
    });

    it('should maintain array reference', () => {
      const reference1 = ALL_CAPABILITIES;
      const reference2 = ALL_CAPABILITIES;

      expect(reference1).to.equal(reference2);
    });
  });
});
