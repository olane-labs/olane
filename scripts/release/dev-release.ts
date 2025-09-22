#!/usr/bin/env tsx

/**
 * Development release utility
 * Provides additional tools for local development and testing
 */

import { createPackageManager } from '../shared/package-manager.ts';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

interface DevOptions {
  command: string;
  packages?: string[];
  parallel?: boolean;
}

class DevReleaseManager {
  private packageManager = createPackageManager(
    dirname(fileURLToPath(import.meta.url)),
  );
  private packages: string[] = [];

  constructor(private options: DevOptions) {
    this.packageManager.discoverPackages();
    this.packages = Array.from(this.packageManager.getAllPackages().keys());
  }

  async clean(): Promise<void> {
    console.log('🧹 Cleaning all packages...');
    const targetPackages = this.options.packages || this.packages;

    await this.packageManager.executeInBatches(
      targetPackages,
      () => 'rm -rf node_modules dist',
      { parallel: this.options.parallel },
    );
  }

  async install(): Promise<void> {
    console.log('📥 Installing dependencies...');
    const targetPackages = this.options.packages || this.packages;

    await this.packageManager.executeInBatches(
      targetPackages,
      () => 'npm install',
      { parallel: this.options.parallel },
    );
  }

  async build(): Promise<void> {
    console.log('🔨 Building packages...');
    const targetPackages = this.options.packages || this.packages;

    await this.packageManager.executeInBatches(
      targetPackages,
      (pkg) => {
        if (this.packageManager.hasScript(pkg, 'build')) {
          return 'npm run build';
        } else {
          console.log(`⏭️  No build script for ${pkg}, skipping...`);
          return 'echo "No build script found, skipping..."';
        }
      },
      { parallel: this.options.parallel },
    );
  }

  async test(): Promise<void> {
    console.log('🧪 Running tests...');
    const targetPackages = this.options.packages || this.packages;

    await this.packageManager.executeInBatches(
      targetPackages,
      (pkg) => {
        if (this.packageManager.hasScript(pkg, 'test')) {
          return 'npm test';
        } else {
          console.log(`⏭️  No test script for ${pkg}, skipping...`);
          return 'echo "No test script found, skipping..."';
        }
      },
      { parallel: this.options.parallel },
    );
  }

  async lint(): Promise<void> {
    console.log('🔍 Running linter...');
    const targetPackages = this.options.packages || this.packages;

    await this.packageManager.executeInBatches(
      targetPackages,
      (pkg) => {
        if (this.packageManager.hasScript(pkg, 'lint')) {
          return 'npm run lint';
        } else {
          console.log(`⏭️  No lint script for ${pkg}, skipping...`);
          return 'echo "No lint script found, skipping..."';
        }
      },
      { parallel: this.options.parallel },
    );
  }

  async status(): Promise<void> {
    console.log('📊 Package status...\n');
    const targetPackages = this.options.packages || this.packages;

    for (const pkg of targetPackages) {
      const packageInfo = this.packageManager.getPackage(pkg);
      if (!packageInfo) {
        console.log(`⚠️  Package ${pkg} not found`);
        continue;
      }

      console.log(`📦 ${packageInfo.name}`);
      console.log(`   Version: ${packageInfo.version}`);
      console.log(`   Path: ${packageInfo.path}`);

      // Check for common scripts
      const availableScripts = this.packageManager.getPackageScripts(pkg);
      const commonScripts = ['build', 'test', 'lint'].filter((script) =>
        availableScripts.includes(script),
      );
      console.log(`   Scripts: ${commonScripts.join(', ') || 'none'}`);

      // Check dependencies
      const allOlaneDeps = this.packageManager.extractAllOlaneDependencies(
        packageInfo.packageJson,
      );
      if (allOlaneDeps.length > 0) {
        console.log(`   Olane deps: ${allOlaneDeps.join(', ')}`);
      }

      console.log('');
    }
  }

  async execute(): Promise<void> {
    switch (this.options.command) {
      case 'clean':
        await this.clean();
        break;
      case 'install':
        await this.install();
        break;
      case 'build':
        await this.build();
        break;
      case 'test':
        await this.test();
        break;
      case 'lint':
        await this.lint();
        break;
      case 'status':
        await this.status();
        break;
      default:
        console.error(`❌ Unknown command: ${this.options.command}`);
        process.exit(1);
    }
  }
}

// CLI Interface
function parseArgs(): DevOptions {
  const args = process.argv.slice(2);
  const options: DevOptions = { command: '' };

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  options.command = args[0];

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--packages':
        options.packages = args[++i].split(',');
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🛠️  Olane Development Release Manager

Usage: tsx dev-release.ts <command> [options]

Commands:
  clean     Clean node_modules and dist directories
  install   Install dependencies for all packages
  build     Build all packages
  test      Run tests for all packages
  lint      Run linter for all packages
  status    Show package information and status

Options:
  --packages PKG1,PKG2   Target specific packages (comma-separated)
  --parallel             Enable parallel processing (future feature)
  --help                Show this help message

Examples:
  tsx dev-release.ts status
  tsx dev-release.ts build --packages o-tool,o-agent
  tsx dev-release.ts clean
  tsx dev-release.ts test --packages o-network
  `);
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const devManager = new DevReleaseManager(options);
  devManager.execute().catch((error) => {
    console.error('❌ Command failed:', error);
    process.exit(1);
  });
}
