#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { createPackageManager } from '../shared/package-manager.ts';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

interface ReleaseOptions {
  skipTests?: boolean;
  skipBuild?: boolean;
  dryRun?: boolean;
  parallel?: boolean;
  versionBump?: 'patch' | 'minor' | 'major';
}

class ReleaseManager {
  private packageManager = createPackageManager(
    dirname(fileURLToPath(import.meta.url)),
  );
  private originalVersion: string = '';

  constructor(private options: ReleaseOptions = {}) {}

  /**
   * Initialize the release manager
   */
  private initialize(): void {
    this.packageManager.discoverPackages();
    this.packageManager.buildDependencyGraph();

    // Store original version from root package before any bumping
    const rootPackage = this.packageManager.getPackage('@olane/o-core');
    if (rootPackage) {
      this.originalVersion = rootPackage.version;
      console.log(`📌 Original version: ${this.originalVersion}`);
    }
  }

  /**
   * Install dependencies for all packages
   */
  private async installDependencies(): Promise<void> {
    console.log('📥 Installing dependencies...');
    const buildOrder = this.packageManager.getBuildOrder();

    await this.packageManager.executeInBatches(
      buildOrder,
      () => 'npm install',
      { dryRun: this.options.dryRun, parallel: this.options.parallel },
    );
  }

  /**
   * Build all packages in dependency order
   */
  private async buildPackages(): Promise<void> {
    if (this.options.skipBuild) {
      console.log('⏭️  Skipping build step');
      return;
    }

    console.log('🔨 Building packages...');
    const buildOrder = this.packageManager.getBuildOrder();

    await this.packageManager.executeInBatches(
      buildOrder,
      (pkg) => {
        const packageInfo = this.packageManager.getPackage(pkg)!;
        const hasUpdatePeers =
          packageInfo.packageJson.scripts?.['update:peers'];

        let command = 'npm run build';
        if (hasUpdatePeers) {
          command = 'npm run update:peers && ' + command;
        }

        return command;
      },
      { dryRun: this.options.dryRun, parallel: this.options.parallel },
    );
  }

  /**
   * Run tests for all packages
   */
  private async runTests(): Promise<void> {
    if (this.options.skipTests) {
      console.log('⏭️  Skipping tests');
      return;
    }

    console.log('🧪 Running tests...');
    const buildOrder = this.packageManager.getBuildOrder();

    await this.packageManager.executeInBatches(
      buildOrder,
      (pkg) => {
        const hasTests = this.packageManager.hasScript(pkg, 'test');

        if (!hasTests) {
          return 'echo "No tests found, skipping..."';
        }

        return 'npm test';
      },
      { dryRun: this.options.dryRun, parallel: this.options.parallel },
    );
  }

  /**
   * Bump version for all packages
   */
  private async bumpVersions(): Promise<void> {
    const versionType = this.options.versionBump || 'patch';
    console.log(`📈 Bumping ${versionType} versions...`);
    const buildOrder = this.packageManager.getBuildOrder();

    for (const pkg of buildOrder) {
      await this.packageManager.execInPackage(
        pkg,
        `npm version ${versionType} --no-git-tag-version`,
        { dryRun: this.options.dryRun },
      );
    }
  }

  /**
   * Publish all packages to npm
   */
  private async publishPackages(): Promise<void> {
    console.log('🚀 Publishing packages...');
    const buildOrder = this.packageManager.getBuildOrder();

    await this.packageManager.executeInBatches(
      buildOrder,
      () => 'npm publish --access public',
      { dryRun: this.options.dryRun, parallel: this.options.parallel },
    );
  }

  /**
   * Create git commit and tag
   */
  private async createGitRelease(): Promise<void> {
    if (this.options.dryRun) {
      console.log('[DRY RUN] Would create git commit and tag');
      return;
    }

    console.log('📝 Creating git release...');
    // Re-discover packages to get updated versions after bump
    this.packageManager.discoverPackages();
    const rootPackage = this.packageManager.getPackage('@olane/o-core');
    if (!rootPackage) throw new Error('Root package not found');

    const newVersion = rootPackage.packageJson.version; // Version after bump
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Use new version for branch name, commit, and tag
    const branchName = `release/v${newVersion}-${timestamp}`;

    try {
      execSync('git add .', {
        cwd: this.packageManager.rootDir,
        stdio: 'inherit',
      });
      execSync(`git checkout -b ${branchName}`, {
        cwd: this.packageManager.rootDir,
        stdio: 'inherit',
      });
      execSync(`git commit -m "Release v${newVersion}"`, {
        cwd: this.packageManager.rootDir,
        stdio: 'inherit',
      });
      execSync(`git tag v${newVersion}`, {
        cwd: this.packageManager.rootDir,
        stdio: 'inherit',
      });

      console.log(`✅ Created release branch: ${branchName}`);
      console.log(`✅ Created tag: v${newVersion}`);
    } catch (error) {
      console.error('❌ Git operations failed:', error);
      throw error;
    }
  }

  /**
   * Main release process
   */
  async release(): Promise<void> {
    try {
      console.log('🚀 Starting release process...\n');

      this.initialize();

      await this.installDependencies();
      await this.buildPackages();
      await this.runTests();

      if (!this.options.dryRun) {
        await this.bumpVersions();
        await this.publishPackages();
        await this.createGitRelease();
      }

      console.log('\n✅ Release process completed successfully!');
    } catch (error) {
      console.error('\n❌ Release process failed:', error);
      process.exit(1);
    }
  }
}

// CLI Interface
function parseArgs(): ReleaseOptions {
  const args = process.argv.slice(2);
  const options: ReleaseOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--skip-tests':
        options.skipTests = true;
        break;
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--version':
        options.versionBump = args[++i] as 'patch' | 'minor' | 'major';
        break;
      case '--help':
        console.log(`
🚀 Olane Release Manager

Usage: npm run release [options]

Options:
  --skip-tests     Skip running tests
  --skip-build     Skip building packages
  --dry-run        Show what would be done without executing
  --parallel       Enable parallel processing where possible
  --version TYPE   Version bump type (patch|minor|major) [default: patch]
  --help          Show this help message

Examples:
  npm run release                    # Standard release with patch version
  npm run release --version minor    # Release with minor version bump
  npm run release --dry-run          # Preview what would happen
  npm run release --parallel         # Use parallel processing
        `);
        process.exit(0);
    }
  }

  return options;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const releaseManager = new ReleaseManager(options);
  releaseManager.release();
}
