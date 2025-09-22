#!/usr/bin/env tsx

/**
 * Test script to verify package discovery functionality
 */

import { createPackageManager } from './shared/package-manager.ts';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

function testPackageDiscovery(): void {
  console.log('🧪 Testing Package Discovery...\n');

  const packageManager = createPackageManager(
    dirname(fileURLToPath(import.meta.url)),
  );

  // Discover packages
  packageManager.discoverPackages();

  // Get all packages
  const allPackages = packageManager.getAllPackages();
  console.log(`📦 Total packages discovered: ${allPackages.size}\n`);

  // List all packages
  console.log('📋 All discovered packages:');
  for (const [name, info] of allPackages) {
    console.log(`  ✓ ${name}@${info.version} (${info.path})`);
  }

  // Get Olane packages using dynamic discovery
  const olanePackages = packageManager.getOlanePackageNames();
  console.log(`\n🎯 Olane packages discovered: ${olanePackages.length}`);

  console.log('\n📋 Discovered Olane packages:');
  olanePackages.forEach((pkg) => {
    console.log(`  ✓ ${pkg}`);
  });

  // Test build order
  packageManager.buildDependencyGraph();
  const buildOrder = packageManager.getBuildOrder();
  console.log(`\n🔗 Build order (${buildOrder.length} packages):`);
  console.log(`   ${buildOrder.join(' → ')}`);

  console.log('\n✅ Package discovery test completed successfully!');
}

// Run test
testPackageDiscovery();
