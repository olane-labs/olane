#!/usr/bin/env tsx

/**
 * Script to restore original dependencies from backups
 * Use this to revert workspace dependency changes
 */

import { createPackageManager } from '../shared/package-manager.ts';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

interface RestorationStats {
  packagesProcessed: number;
  packagesRestored: number;
  backupsRemoved: number;
  backupsNotFound: number;
}

class DependencyRestorer {
  private packageManager = createPackageManager(
    dirname(fileURLToPath(import.meta.url)),
  );
  private stats: RestorationStats = {
    packagesProcessed: 0,
    packagesRestored: 0,
    backupsRemoved: 0,
    backupsNotFound: 0,
  };

  constructor() {
    this.packageManager.discoverPackages();
  }

  /**
   * Restore a single package's dependencies from backup
   */
  private restorePackage(packageName: string): void {
    const packageInfo = this.packageManager.getPackage(packageName);
    if (!packageInfo) {
      console.log(`⚠️  Package ${packageName} not found in workspace`);
      return;
    }

    console.log(`🔍 Processing ${packageInfo.name}...`);

    const restored = this.packageManager.restorePackageFromBackup(packageName);

    if (!restored) {
      console.log(`  ⚠️  No backup found for ${packageInfo.name}`);
      this.stats.backupsNotFound++;
    } else {
      console.log(`  ✅ Restored ${packageInfo.name}`);
      this.stats.packagesRestored++;
      this.stats.backupsRemoved++;
    }

    this.stats.packagesProcessed++;
  }

  /**
   * Restore all packages in the workspace
   */
  async restoreAllPackages(): Promise<RestorationStats> {
    console.log('🔄 Restoring original dependencies...\n');

    for (const [packageName] of this.packageManager.getAllPackages()) {
      this.restorePackage(packageName);
    }

    return this.stats;
  }

  /**
   * Print restoration summary
   */
  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESTORATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`📦 Packages processed: ${this.stats.packagesProcessed}`);
    console.log(`✅ Packages restored: ${this.stats.packagesRestored}`);
    console.log(`🗑️  Backup files removed: ${this.stats.backupsRemoved}`);
    console.log(`⚠️  Backups not found: ${this.stats.backupsNotFound}`);

    if (this.stats.packagesRestored > 0) {
      console.log('\n✅ Dependencies restored to original state!');
      console.log('💡 Run "npm install" to reinstall original dependencies');
    } else {
      console.log('\n➖ No packages were restored (no backups found)');
    }
  }
}

async function main(): Promise<void> {
  try {
    const restorer = new DependencyRestorer();
    const stats = await restorer.restoreAllPackages();
    restorer.printSummary();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during restoration:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
