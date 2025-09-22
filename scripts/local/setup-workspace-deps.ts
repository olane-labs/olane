#!/usr/bin/env tsx

/**
 * Script to convert peer dependencies to workspace dependencies for local development
 * This creates workspace-specific package.json files that link packages locally
 */

import { createPackageManager } from '../shared/package-manager.ts';

interface ConversionStats {
  packagesProcessed: number;
  dependenciesConverted: number;
  backupsCreated: number;
}

class WorkspaceDependencyConverter {
  private packageManager = createPackageManager(__dirname);
  private stats: ConversionStats = {
    packagesProcessed: 0,
    dependenciesConverted: 0,
    backupsCreated: 0,
  };

  constructor() {
    this.packageManager.discoverPackages();
  }

  /**
   * Convert a single package's dependencies to workspace references
   */
  private convertPackageToWorkspace(packageName: string): void {
    const packageInfo = this.packageManager.getPackage(packageName);
    if (!packageInfo) {
      console.log(`⚠️  Skipping ${packageName} - not found in workspace`);
      return;
    }

    console.log(`\n🔍 Processing ${packageInfo.name}...`);

    // Create backup first
    this.packageManager.createPackageBackup(packageName);
    this.stats.backupsCreated++;

    // Convert to workspace references
    const convertedCount =
      this.packageManager.convertToWorkspaceReferences(packageName);

    if (convertedCount > 0) {
      console.log(
        `✅ Updated ${packageInfo.name} (${convertedCount} dependencies converted)`,
      );
      this.stats.dependenciesConverted += convertedCount;
    } else {
      console.log(`➖ No changes needed for ${packageInfo.name}`);
    }

    this.stats.packagesProcessed++;
  }

  /**
   * Convert all packages in the workspace
   */
  async convertAllPackages(): Promise<ConversionStats> {
    console.log('🔄 Converting dependencies to workspace references...\n');

    for (const [packageName] of this.packageManager.getAllPackages()) {
      this.convertPackageToWorkspace(packageName);
    }

    return this.stats;
  }

  /**
   * Print conversion summary
   */
  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CONVERSION SUMMARY');
    console.log('='.repeat(60));
    console.log(`📦 Packages processed: ${this.stats.packagesProcessed}`);
    console.log(
      `🔗 Dependencies converted: ${this.stats.dependenciesConverted}`,
    );
    console.log(`💾 Backup files created: ${this.stats.backupsCreated}`);
    console.log('\n✅ Workspace dependency conversion complete!');
    console.log('\n📝 Original package.json files backed up as *.original');
    console.log('💡 Run "npm install" to install workspace dependencies');
  }
}

async function main(): Promise<void> {
  try {
    const converter = new WorkspaceDependencyConverter();
    const stats = await converter.convertAllPackages();
    converter.printSummary();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during conversion:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
