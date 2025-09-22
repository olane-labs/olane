#!/usr/bin/env tsx

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

interface PackageInfo {
  name: string;
  version: string;
  path: string;
  packageJson: any;
  dependencies: string[];
  peerDependencies: string[];
}

interface ReleaseOptions {
  skipTests?: boolean;
  skipBuild?: boolean;
  dryRun?: boolean;
  parallel?: boolean;
  versionBump?: 'patch' | 'minor' | 'major';
}

class ReleaseManager {
  private packages: Map<string, PackageInfo> = new Map();
  private dependencyGraph: Map<string, string[]> = new Map();
  private buildOrder: string[] = [];

  constructor(private options: ReleaseOptions = {}) {}

  /**
   * Discover all packages in the workspace
   */
  private discoverPackages(): void {
    console.log('🔍 Discovering packages...');

    // Root package
    this.addPackage(ROOT_DIR, 'root');

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

      for (const dir of packageDirs) {
        this.addPackage(join(packagesDir, dir), dir);
      }
    }

    console.log(`📦 Found ${this.packages.size} packages`);
  }

  /**
   * Add a package to the registry
   */
  private addPackage(path: string, dirName: string): void {
    const packageJsonPath = join(path, 'package.json');
    if (!existsSync(packageJsonPath)) return;

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const dependencies = this.extractOlaneDependencies(packageJson);
      const peerDependencies = this.extractOlanePeerDependencies(packageJson);

      const packageInfo: PackageInfo = {
        name: packageJson.name || dirName,
        version: packageJson.version || '0.0.0',
        path,
        packageJson,
        dependencies,
        peerDependencies,
      };

      this.packages.set(packageInfo.name, packageInfo);
      console.log(`  ✓ ${packageInfo.name}@${packageInfo.version}`);
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${packageJsonPath}:`, error);
    }
  }

  /**
   * Extract @olane dependencies from package.json
   */
  private extractOlaneDependencies(packageJson: any): string[] {
    const deps: string[] = [];
    const sections = ['dependencies', 'devDependencies', 'peerDependencies'];

    for (const section of sections) {
      if (packageJson[section]) {
        for (const dep of Object.keys(packageJson[section])) {
          if (dep.startsWith('@olane/')) {
            deps.push(dep);
          }
        }
      }
    }

    return [...new Set(deps)];
  }

  /**
   * Extract @olane peer dependencies from package.json
   */
  private extractOlanePeerDependencies(packageJson: any): string[] {
    const deps: string[] = [];
    if (packageJson.peerDependencies) {
      for (const dep of Object.keys(packageJson.peerDependencies)) {
        if (dep.startsWith('@olane/')) {
          deps.push(dep);
        }
      }
    }
    return deps;
  }

  /**
   * Build dependency graph and determine build order
   */
  private buildDependencyGraph(): void {
    console.log('🔗 Building dependency graph...');

    // Initialize graph
    for (const pkg of this.packages.values()) {
      this.dependencyGraph.set(pkg.name, []);
    }

    // Build edges
    for (const pkg of this.packages.values()) {
      const edges: string[] = [];
      for (const dep of [...pkg.dependencies, ...pkg.peerDependencies]) {
        if (this.packages.has(dep)) {
          edges.push(dep);
        }
      }
      this.dependencyGraph.set(pkg.name, edges);
    }

    // Topological sort for build order
    this.buildOrder = this.topologicalSort();
    console.log('📋 Build order:', this.buildOrder.join(' → '));
  }

  /**
   * Topological sort to determine build order
   */
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (node: string): void => {
      if (visiting.has(node)) {
        throw new Error(`Circular dependency detected involving ${node}`);
      }
      if (visited.has(node)) return;

      visiting.add(node);
      const dependencies = this.dependencyGraph.get(node) || [];

      for (const dep of dependencies) {
        visit(dep);
      }

      visiting.delete(node);
      visited.add(node);
      result.push(node);
    };

    for (const node of this.dependencyGraph.keys()) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    return result;
  }

  /**
   * Execute a command in a package directory
   */
  private async execInPackage(
    packageName: string,
    command: string,
  ): Promise<void> {
    const pkg = this.packages.get(packageName);
    if (!pkg) throw new Error(`Package ${packageName} not found`);

    console.log(`  🔨 ${packageName}: ${command}`);

    if (this.options.dryRun) {
      console.log(`    [DRY RUN] Would execute: ${command}`);
      return;
    }

    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        cwd: pkg.path,
        stdio: 'inherit',
        env: { ...process.env },
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Execute commands in parallel for packages at the same dependency level
   */
  private async executeInBatches(
    packages: string[],
    commandFn: (pkg: string) => string,
  ): Promise<void> {
    if (!this.options.parallel) {
      // Sequential execution
      for (const pkg of packages) {
        await this.execInPackage(pkg, commandFn(pkg));
      }
      return;
    }

    // Group packages by dependency level for parallel execution
    const levels = this.groupByDependencyLevel(packages);

    for (const [level, levelPackages] of levels.entries()) {
      console.log(`📦 Processing level ${level}: ${levelPackages.join(', ')}`);

      const promises = levelPackages.map((pkg) =>
        this.execInPackage(pkg, commandFn(pkg)),
      );

      await Promise.all(promises);
    }
  }

  /**
   * Group packages by their dependency level for parallel processing
   */
  private groupByDependencyLevel(packages: string[]): Map<number, string[]> {
    const levels = new Map<number, string[]>();
    const packageLevels = new Map<string, number>();

    const calculateLevel = (pkg: string): number => {
      if (packageLevels.has(pkg)) {
        return packageLevels.get(pkg)!;
      }

      const dependencies = this.dependencyGraph.get(pkg) || [];
      const internalDeps = dependencies.filter((dep) => packages.includes(dep));

      if (internalDeps.length === 0) {
        packageLevels.set(pkg, 0);
        return 0;
      }

      const maxDepLevel = Math.max(
        ...internalDeps.map((dep) => calculateLevel(dep)),
      );
      const level = maxDepLevel + 1;
      packageLevels.set(pkg, level);
      return level;
    };

    for (const pkg of packages) {
      const level = calculateLevel(pkg);
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(pkg);
    }

    return levels;
  }

  /**
   * Install dependencies for all packages
   */
  private async installDependencies(): Promise<void> {
    console.log('📥 Installing dependencies...');

    await this.executeInBatches(this.buildOrder, () => 'npm install');
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

    await this.executeInBatches(this.buildOrder, (pkg) => {
      const packageInfo = this.packages.get(pkg)!;
      const hasUpdatePeers = packageInfo.packageJson.scripts?.['update:peers'];

      let command = 'npm run build';
      if (hasUpdatePeers) {
        command = 'npm run update:peers && ' + command;
      }

      return command;
    });
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

    await this.executeInBatches(this.buildOrder, (pkg) => {
      const packageInfo = this.packages.get(pkg)!;
      const hasTests = packageInfo.packageJson.scripts?.test;

      if (!hasTests) {
        return 'echo "No tests found, skipping..."';
      }

      return 'npm test';
    });
  }

  /**
   * Bump version for all packages
   */
  private async bumpVersions(): Promise<void> {
    const versionType = this.options.versionBump || 'patch';
    console.log(`📈 Bumping ${versionType} versions...`);

    for (const pkg of this.buildOrder) {
      await this.execInPackage(
        pkg,
        `npm version ${versionType} --no-git-tag-version`,
      );
    }
  }

  /**
   * Publish all packages to npm
   */
  private async publishPackages(): Promise<void> {
    console.log('🚀 Publishing packages...');

    await this.executeInBatches(
      this.buildOrder,
      () => 'npm publish --access public',
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

    const rootPackage = this.packages.get('@olane/o-core');
    if (!rootPackage) throw new Error('Root package not found');

    const version = rootPackage.packageJson.version;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `release/v${version}-${timestamp}`;

    try {
      execSync('git add .', { cwd: ROOT_DIR, stdio: 'inherit' });
      execSync(`git checkout -b ${branchName}`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
      execSync(`git commit -m "Release v${version}"`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
      execSync(`git tag v${version}`, { cwd: ROOT_DIR, stdio: 'inherit' });

      console.log(`✅ Created release branch: ${branchName}`);
      console.log(`✅ Created tag: v${version}`);
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

      this.discoverPackages();
      this.buildDependencyGraph();

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
