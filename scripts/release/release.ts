#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { createPackageManager } from '../shared/package-manager.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

interface ReleaseOptions {
  skipTests?: boolean;
  skipBuild?: boolean;
  dryRun?: boolean;
  parallel?: boolean;
  versionBump?: 'patch' | 'minor' | 'major';
  prerelease?: 'alpha' | 'beta' | 'rc';
  promote?: boolean;
  promoteTo?: 'beta' | 'rc' | 'production';
  createGitHubRelease?: boolean;
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
   * In a workspace setup, we install at the root level
   */
  private async installDependencies(): Promise<void> {
    console.log('📥 Installing workspace dependencies...');

    if (this.options.dryRun) {
      console.log('[DRY RUN] Would run: npm install (at root)');
      return;
    }

    try {
      const { execSync } = await import('child_process');
      execSync('npm install', {
        cwd: this.packageManager.rootDir,
        stdio: 'inherit',
      });
      console.log('✅ Workspace dependencies installed');
    } catch (error) {
      console.error('❌ Failed to install workspace dependencies:', error);
      throw error;
    }
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
      () => {
        // Don't run update:peers during release - it will be handled after version bump
        return 'npm run build';
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
    let command: string;
    let description: string;

    if (this.options.prerelease) {
      // Pre-release: 0.7.11 → 0.7.12-alpha.0 or 0.7.12-alpha.0 → 0.7.12-alpha.1
      const preid = this.options.prerelease;
      command = `npm version prerelease --preid=${preid} --no-git-tag-version`;
      description = `${preid} pre-release`;
    } else if (this.options.promote) {
      // Promotion: detect current stage and bump to next
      const currentVersion = this.getCurrentVersion();
      const nextStage = this.getNextStage(currentVersion);

      if (nextStage === 'production') {
        // Remove pre-release identifier: 0.7.12-rc.3 → 0.7.12
        command = `npm version patch --no-git-tag-version`;
        description = 'production release';
      } else {
        // Bump to next pre-release stage: 0.7.12-alpha.5 → 0.7.12-beta.0
        command = `npm version prerelease --preid=${nextStage} --no-git-tag-version`;
        description = `${nextStage} pre-release`;
      }
    } else {
      // Standard production release
      const versionType = this.options.versionBump || 'patch';
      command = `npm version ${versionType} --no-git-tag-version`;
      description = `${versionType} version`;
    }

    console.log(`📈 Bumping ${description}...`);
    const buildOrder = this.packageManager.getBuildOrder();

    for (const pkg of buildOrder) {
      await this.packageManager.execInPackage(pkg, command, {
        dryRun: this.options.dryRun,
      });
    }
  }

  /**
   * Get current version from o-core package
   */
  private getCurrentVersion(): string {
    const pkg = this.packageManager.getPackage('@olane/o-core');
    if (!pkg) throw new Error('Could not find @olane/o-core package');
    return pkg.version;
  }

  /**
   * Determine next stage for promotion
   */
  private getNextStage(currentVersion: string): string {
    // If explicit target specified, use that
    if (this.options.promoteTo) {
      return this.options.promoteTo;
    }

    // Auto-detect next stage
    if (currentVersion.includes('-alpha')) return 'beta';
    if (currentVersion.includes('-beta')) return 'rc';
    if (currentVersion.includes('-rc')) return 'production';

    throw new Error(
      `Cannot promote version ${currentVersion}. Use explicit --promoteTo flag or ensure version has pre-release identifier.`,
    );
  }

  /**
   * Publish all packages to npm
   * Before publishing, we need to convert workspace:* references to actual version numbers
   */
  private async publishPackages(): Promise<void> {
    const npmTag = this.getNpmTag();
    console.log(`🚀 Publishing packages with tag: ${npmTag}...`);
    const buildOrder = this.packageManager.getBuildOrder();

    // Convert workspace references to version numbers before publishing
    console.log('🔄 Converting workspace references to version numbers...');
    for (const pkg of buildOrder) {
      if (!this.options.dryRun) {
        this.packageManager.convertFromWorkspaceReferences(pkg);
      } else {
        console.log(`[DRY RUN] Would convert workspace references for ${pkg}`);
      }
    }

    await this.packageManager.executeInBatches(
      buildOrder,
      () => `npm publish --access public --tag ${npmTag}`,
      { dryRun: this.options.dryRun, parallel: this.options.parallel },
    );

    // After publishing, restore workspace references
    if (!this.options.dryRun) {
      console.log('🔄 Restoring workspace references...');
      for (const pkg of buildOrder) {
        // this.packageManager.convertToWorkspaceReferences(pkg);
      }
    }
  }

  /**
   * Determine npm tag for publishing
   */
  private getNpmTag(): string {
    // Explicit pre-release flag
    if (this.options.prerelease === 'alpha') return 'alpha';
    if (this.options.prerelease === 'beta') return 'beta';
    if (this.options.prerelease === 'rc') return 'next';

    // Detect from current version (for promotions)
    const currentVersion = this.getCurrentVersion();
    if (currentVersion.includes('-alpha')) return 'alpha';
    if (currentVersion.includes('-beta')) return 'beta';
    if (currentVersion.includes('-rc')) return 'next';

    // Default to latest for production releases
    return 'latest';
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
      // execSync(`git tag v${newVersion}`, {
      //   cwd: this.packageManager.rootDir,
      //   stdio: 'inherit',
      // });
      execSync(`git push --set-upstream origin ${branchName}`, {
        cwd: this.packageManager.rootDir,
        stdio: 'inherit',
      });

      console.log(`✅ Created release branch: ${branchName}`);
      // console.log(`✅ Created tag: v${newVersion}`);

      // Create GitHub release if enabled
      if (this.options.createGitHubRelease !== false) {
        await this.createGitHubReleaseAPI(newVersion);
      }
    } catch (error) {
      console.error('❌ Git operations failed:', error);
      throw error;
    }
  }

  /**
   * Create GitHub release via gh CLI
   */
  private async createGitHubReleaseAPI(version: string): Promise<void> {
    const isPrerelease = version.includes('-');
    const releaseType = this.getReleaseType(version);
    const title = this.getReleaseTitle(version, releaseType);
    const body = this.generateReleaseNotes(version, releaseType);

    console.log(`\n📦 Creating GitHub ${releaseType} release...`);

    if (this.options.dryRun) {
      console.log(
        `[DRY RUN] Would create GitHub release: v${version} (pre-release: ${isPrerelease})`,
      );
      console.log(`Title: ${title}`);
      console.log(`Body:\n${body}`);
      return;
    }

    try {
      const currentBranch = execSync('git branch --show-current', {
        cwd: this.packageManager.rootDir,
        encoding: 'utf8',
      }).trim();

      const releaseCommand = `gh release create v${version} \
        --title "${title}" \
        --notes "${body}" \
        ${isPrerelease ? '--prerelease' : ''} \
        --target ${currentBranch}`;

      execSync(releaseCommand, {
        cwd: this.packageManager.rootDir,
        stdio: 'inherit',
      });

      console.log(`✅ Created GitHub release: v${version}`);
    } catch (error) {
      console.error('❌ Failed to create GitHub release:', error);
      console.log(
        '⚠️  You can create it manually or the workflow will handle it',
      );
      // Don't throw - this is not critical
    }
  }

  /**
   * Get release type from version string
   */
  private getReleaseType(version: string): string {
    if (version.includes('-alpha')) return 'Alpha';
    if (version.includes('-beta')) return 'Beta';
    if (version.includes('-rc')) return 'Release Candidate';
    return 'Release';
  }

  /**
   * Generate release title
   */
  private getReleaseTitle(version: string, type: string): string {
    return `${type} v${version}`;
  }

  /**
   * Generate release notes
   */
  private generateReleaseNotes(version: string, type: string): string {
    const packages = this.packageManager.getBuildOrder();
    const installTag = this.getNpmTag();

    const installInstructions =
      installTag === 'latest'
        ? packages.map((pkg) => `npm install ${pkg}`).join('\\n')
        : packages.map((pkg) => `npm install ${pkg}@${installTag}`).join('\\n');

    const warningNote =
      type === 'Release'
        ? ''
        : `\\n\\n---\\n*This is a ${type.toLowerCase()} and may contain bugs. Use at your own risk.*`;

    return `## ${type} v${version}

### 📦 Installation

\`\`\`bash
${installInstructions}
\`\`\`

### Packages Published
${packages.map((pkg) => `- ${pkg}@${version}`).join('\\n')}${warningNote}`;
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
      // await this.runTests();

      // Always run these steps (they handle dry-run internally)
      await this.bumpVersions();

      await this.publishPackages();
      await this.createGitRelease();

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
      case '--prerelease':
        options.prerelease = args[++i] as 'alpha' | 'beta' | 'rc';
        break;
      case '--promote':
        options.promote = true;
        break;
      case '--promoteTo':
      case '--to':
        options.promoteTo = args[++i] as 'beta' | 'rc' | 'production';
        break;
      case '--no-github-release':
        options.createGitHubRelease = false;
        break;
      case '--help':
        console.log(`
🚀 Olane Release Manager

Usage: npm run release [options]

Options:
  --skip-tests            Skip running tests
  --skip-build            Skip building packages
  --dry-run               Show what would be done without executing
  --parallel              Enable parallel processing where possible
  --version TYPE          Version bump type (patch|minor|major) [default: patch]
  --prerelease TYPE       Create pre-release (alpha|beta|rc)
  --promote               Promote to next stage
  --to STAGE              Target stage for promotion (beta|rc|production)
  --no-github-release     Skip GitHub release creation
  --help                  Show this help message

Examples:
  # Standard releases
  npm run release                          # Patch release (0.7.11 → 0.7.12)
  npm run release --version minor          # Minor release (0.7.11 → 0.8.0)
  npm run release --version major          # Major release (0.7.11 → 1.0.0)

  # Pre-releases
  npm run release --prerelease alpha       # Alpha release (0.7.11 → 0.7.12-alpha.0)
  npm run release --prerelease beta        # Beta release
  npm run release --prerelease rc          # Release candidate

  # Promotions
  npm run release --promote                # Auto-promote to next stage
  npm run release --promote --to beta      # Promote to specific stage
  npm run release --promote --to production # Promote to production

  # Testing
  npm run release --dry-run                # Preview without making changes
  npm run release --prerelease alpha --dry-run
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
