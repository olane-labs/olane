#!/usr/bin/env tsx

/**
 * Development release utility
 * Provides additional tools for local development and testing
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

interface DevOptions {
  command: string;
  packages?: string[];
  parallel?: boolean;
}

class DevReleaseManager {
  private packages: string[] = [];

  constructor(private options: DevOptions) {
    this.discoverPackages();
  }

  private discoverPackages(): void {
    // Root package
    if (existsSync(join(ROOT_DIR, 'package.json'))) {
      this.packages.push('root');
    }

    // Packages directory
    const packagesDir = join(ROOT_DIR, 'packages');
    if (existsSync(packagesDir)) {
      const packageDirs = execSync('ls -1', {
        cwd: packagesDir,
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter(
          (dir) => dir && existsSync(join(packagesDir, dir, 'package.json')),
        );

      this.packages.push(...packageDirs);
    }
  }

  private getPackagePath(packageName: string): string {
    if (packageName === 'root') {
      return ROOT_DIR;
    }
    return join(ROOT_DIR, 'packages', packageName);
  }

  private execInPackage(packageName: string, command: string): void {
    const packagePath = this.getPackagePath(packageName);
    console.log(`🔨 ${packageName}: ${command}`);

    try {
      execSync(command, {
        cwd: packagePath,
        stdio: 'inherit',
        env: { ...process.env },
      });
    } catch (error) {
      console.error(`❌ Failed in ${packageName}:`, error);
      throw error;
    }
  }

  async clean(): Promise<void> {
    console.log('🧹 Cleaning all packages...');
    const targetPackages = this.options.packages || this.packages;

    for (const pkg of targetPackages) {
      this.execInPackage(pkg, 'rm -rf node_modules dist');
    }
  }

  async install(): Promise<void> {
    console.log('📥 Installing dependencies...');
    const targetPackages = this.options.packages || this.packages;

    for (const pkg of targetPackages) {
      this.execInPackage(pkg, 'npm install');
    }
  }

  async build(): Promise<void> {
    console.log('🔨 Building packages...');
    const targetPackages = this.options.packages || this.packages;

    for (const pkg of targetPackages) {
      const packagePath = this.getPackagePath(pkg);
      const packageJson = JSON.parse(
        readFileSync(join(packagePath, 'package.json'), 'utf8'),
      );

      if (packageJson.scripts?.build) {
        this.execInPackage(pkg, 'npm run build');
      } else {
        console.log(`⏭️  No build script for ${pkg}, skipping...`);
      }
    }
  }

  async test(): Promise<void> {
    console.log('🧪 Running tests...');
    const targetPackages = this.options.packages || this.packages;

    for (const pkg of targetPackages) {
      const packagePath = this.getPackagePath(pkg);
      const packageJson = JSON.parse(
        readFileSync(join(packagePath, 'package.json'), 'utf8'),
      );

      if (packageJson.scripts?.test) {
        this.execInPackage(pkg, 'npm test');
      } else {
        console.log(`⏭️  No test script for ${pkg}, skipping...`);
      }
    }
  }

  async lint(): Promise<void> {
    console.log('🔍 Running linter...');
    const targetPackages = this.options.packages || this.packages;

    for (const pkg of targetPackages) {
      const packagePath = this.getPackagePath(pkg);
      const packageJson = JSON.parse(
        readFileSync(join(packagePath, 'package.json'), 'utf8'),
      );

      if (packageJson.scripts?.lint) {
        this.execInPackage(pkg, 'npm run lint');
      } else {
        console.log(`⏭️  No lint script for ${pkg}, skipping...`);
      }
    }
  }

  async status(): Promise<void> {
    console.log('📊 Package status...\n');
    const targetPackages = this.options.packages || this.packages;

    for (const pkg of targetPackages) {
      const packagePath = this.getPackagePath(pkg);
      const packageJson = JSON.parse(
        readFileSync(join(packagePath, 'package.json'), 'utf8'),
      );

      console.log(`📦 ${packageJson.name || pkg}`);
      console.log(`   Version: ${packageJson.version}`);
      console.log(`   Path: ${packagePath}`);

      // Check for common scripts
      const scripts = packageJson.scripts || {};
      const availableScripts = ['build', 'test', 'lint'].filter(
        (script) => scripts[script],
      );
      console.log(`   Scripts: ${availableScripts.join(', ') || 'none'}`);

      // Check dependencies
      const olaneDeps = Object.keys({
        ...packageJson.dependencies,
        ...packageJson.peerDependencies,
        ...packageJson.devDependencies,
      }).filter((dep) => dep.startsWith('@olane/'));

      if (olaneDeps.length > 0) {
        console.log(`   Olane deps: ${olaneDeps.join(', ')}`);
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
