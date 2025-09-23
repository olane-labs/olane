#!/usr/bin/env tsx

/**
 * Shared Package Manager Utility
 * Provides common functionality for discovering, managing, and operating on workspace packages
 */

import { execSync, spawn } from 'child_process';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  copyFileSync,
  unlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Common Olane packages that should be converted to workspace references
// This constant is kept for backward compatibility, but the class now uses dynamic discovery
export const OLANE_PACKAGES = [
  '@olane/o-protocol',
  '@olane/o-config',
  '@olane/o-core',
  '@olane/o-tool',
  '@olane/o-intelligence',
  '@olane/o-storage',
  '@olane/o-leader',
  '@olane/o-agent',
  '@olane/o-mcp',
  '@olane/o-gateway-interface',
  '@olane/o-tools-common',
  '@olane/o-tool-registry',
  '@olane/o-network',
];

export interface PackageInfo {
  name: string;
  version: string;
  path: string;
  packageJson: any;
  dependencies: string[];
  peerDependencies: string[];
  devDependencies: string[];
}

export interface ExecutionOptions {
  dryRun?: boolean;
  parallel?: boolean;
  stdio?: 'inherit' | 'pipe' | 'ignore';
}

export class PackageManager {
  private packages: Map<string, PackageInfo> = new Map();
  private dependencyGraph: Map<string, string[]> = new Map();
  private buildOrder: string[] = [];

  // Directory paths
  public readonly rootDir: string;
  public readonly packagesDir: string;
  public readonly cliDir: string;

  constructor(scriptDir?: string) {
    const currentDir = scriptDir || dirname(fileURLToPath(import.meta.url));
    this.rootDir = join(currentDir, '../..');
    this.packagesDir = join(this.rootDir, 'packages');
    this.cliDir = join(this.rootDir, '../o-network-cli');
  }

  /**
   * Discover all packages in the workspace
   */
  public discoverPackages(): void {
    console.log('🔍 Discovering packages...');
    this.packages.clear();

    // Root package (do not add it)
    // this.addPackage(this.rootDir, 'root');

    // Packages directory
    if (existsSync(this.packagesDir)) {
      const packageDirs = readdirSync(this.packagesDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      for (const dir of packageDirs) {
        const packagePath = join(this.packagesDir, dir);
        this.addPackage(packagePath, dir);
      }
    }

    // CLI package if it exists
    // if (existsSync(this.cliDir)) {
    //   this.addPackage(this.cliDir, 'cli');
    // }

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
      const dependencies = this.extractOlaneDependencies(
        packageJson,
        'dependencies',
      );
      const peerDependencies = this.extractOlaneDependencies(
        packageJson,
        'peerDependencies',
      );
      const devDependencies = this.extractOlaneDependencies(
        packageJson,
        'devDependencies',
      );

      const packageInfo: PackageInfo = {
        name: packageJson.name || dirName,
        version: packageJson.version || '0.0.0',
        path,
        packageJson,
        dependencies,
        peerDependencies,
        devDependencies,
      };

      this.packages.set(packageInfo.name, packageInfo);
      console.log(`  ✓ ${packageInfo.name}@${packageInfo.version}`);
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${packageJsonPath}:`, error);
    }
  }

  /**
   * Extract @olane dependencies from a specific section of package.json
   */
  private extractOlaneDependencies(
    packageJson: any,
    section: string,
  ): string[] {
    const deps: string[] = [];

    if (packageJson[section]) {
      for (const dep of Object.keys(packageJson[section])) {
        if (dep.startsWith('@olane/')) {
          deps.push(dep);
        }
      }
    }

    return deps;
  }

  /**
   * Extract all @olane dependencies from package.json (all sections combined)
   */
  public extractAllOlaneDependencies(packageJson: any): string[] {
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
   * Build dependency graph and determine build order
   */
  public buildDependencyGraph(): void {
    console.log('🔗 Building dependency graph...');

    // Initialize graph
    for (const pkg of this.packages.values()) {
      this.dependencyGraph.set(pkg.name, []);
    }

    // Build edges
    for (const pkg of this.packages.values()) {
      const edges: string[] = [];
      for (const dep of [
        ...pkg.dependencies,
        ...pkg.peerDependencies,
        ...pkg.devDependencies,
      ]) {
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
  public async execInPackage(
    packageName: string,
    command: string,
    options: ExecutionOptions = {},
  ): Promise<void> {
    const pkg = this.packages.get(packageName);
    if (!pkg) throw new Error(`Package ${packageName} not found`);

    console.log(`  🔨 ${packageName}: ${command}`);

    if (options.dryRun) {
      console.log(`    [DRY RUN] Would execute: ${command}`);
      return;
    }

    const stdio = options.stdio || 'inherit';

    if (stdio === 'inherit') {
      // Use spawn for interactive commands
      return new Promise((resolve, reject) => {
        const child = spawn('bash', ['-c', command], {
          cwd: pkg.path,
          stdio,
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
    } else {
      // Use execSync for non-interactive commands
      try {
        execSync(command, {
          cwd: pkg.path,
          stdio,
          env: { ...process.env },
        });
      } catch (error) {
        throw new Error(`Command failed in ${packageName}: ${error}`);
      }
    }
  }

  /**
   * Execute commands in parallel for packages at the same dependency level
   */
  public async executeInBatches(
    packages: string[],
    commandFn: (pkg: string) => string,
    options: ExecutionOptions = {},
  ): Promise<void> {
    if (!options.parallel) {
      // Sequential execution
      for (const pkg of packages) {
        await this.execInPackage(pkg, commandFn(pkg), options);
      }
      return;
    }

    // Group packages by dependency level for parallel execution
    const levels = this.groupByDependencyLevel(packages);

    for (const [level, levelPackages] of levels.entries()) {
      console.log(`📦 Processing level ${level}: ${levelPackages.join(', ')}`);

      const promises = levelPackages.map((pkg) =>
        this.execInPackage(pkg, commandFn(pkg), options),
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
   * Get package by name
   */
  public getPackage(packageName: string): PackageInfo | undefined {
    return this.packages.get(packageName);
  }

  /**
   * Get all packages
   */
  public getAllPackages(): Map<string, PackageInfo> {
    return this.packages;
  }

  /**
   * Get build order
   */
  public getBuildOrder(): string[] {
    return this.buildOrder;
  }

  /**
   * Get package path by name
   */
  public getPackagePath(packageName: string): string {
    const pkg = this.packages.get(packageName);
    if (pkg) {
      return pkg.path;
    }

    // Handle special cases for backward compatibility
    if (packageName === 'root') {
      return this.rootDir;
    }

    // Try to find in packages directory
    const packagePath = join(this.packagesDir, packageName);
    if (existsSync(join(packagePath, 'package.json'))) {
      return packagePath;
    }

    throw new Error(`Package ${packageName} not found`);
  }

  /**
   * Create backup of package.json
   */
  public createPackageBackup(
    packageName: string,
    suffix: string = '.original',
  ): void {
    const pkg = this.packages.get(packageName);
    if (!pkg) throw new Error(`Package ${packageName} not found`);

    const packageJsonPath = join(pkg.path, 'package.json');
    const backupPath = packageJsonPath + suffix;

    copyFileSync(packageJsonPath, backupPath);
  }

  /**
   * Restore package.json from backup
   */
  public restorePackageFromBackup(
    packageName: string,
    suffix: string = '.original',
  ): boolean {
    const pkg = this.packages.get(packageName);
    if (!pkg) throw new Error(`Package ${packageName} not found`);

    const packageJsonPath = join(pkg.path, 'package.json');
    const backupPath = packageJsonPath + suffix;

    if (!existsSync(backupPath)) {
      return false;
    }

    try {
      copyFileSync(backupPath, packageJsonPath);
      unlinkSync(backupPath);
      return true;
    } catch (error) {
      console.error(`Failed to restore ${packageName}:`, error);
      return false;
    }
  }

  /**
   * Update package.json for a specific package
   */
  public updatePackageJson(packageName: string, updatedPackageJson: any): void {
    const pkg = this.packages.get(packageName);
    if (!pkg) throw new Error(`Package ${packageName} not found`);

    const packageJsonPath = join(pkg.path, 'package.json');
    writeFileSync(
      packageJsonPath,
      JSON.stringify(updatedPackageJson, null, 2) + '\n',
    );

    // Update in-memory representation
    pkg.packageJson = updatedPackageJson;
  }

  /**
   * Convert dependencies to workspace references
   */
  public convertToWorkspaceReferences(packageName: string): number {
    const pkg = this.packages.get(packageName);
    if (!pkg) throw new Error(`Package ${packageName} not found`);

    let convertedCount = 0;
    const updatedPackageJson = { ...pkg.packageJson };
    const olanePackages = this.getOlanePackageNames();

    // Convert peerDependencies to dependencies with workspace references
    if (updatedPackageJson.peerDependencies) {
      updatedPackageJson.dependencies = updatedPackageJson.dependencies || {};

      for (const [dep, version] of Object.entries(
        updatedPackageJson.peerDependencies,
      )) {
        if (olanePackages.includes(dep)) {
          updatedPackageJson.dependencies[dep] = 'workspace:*';
          console.log(`  📦 ${dep}: ${version} → workspace:*`);
          convertedCount++;
        }
      }
    }

    // Convert regular dependencies to workspace references for Olane packages
    if (updatedPackageJson.dependencies) {
      for (const [dep, version] of Object.entries(
        updatedPackageJson.dependencies,
      )) {
        if (
          olanePackages.includes(dep) &&
          !String(version).startsWith('workspace:')
        ) {
          updatedPackageJson.dependencies[dep] = 'workspace:*';
          console.log(`  📦 ${dep}: ${version} → workspace:*`);
          convertedCount++;
        }
      }
    }

    if (convertedCount > 0) {
      this.updatePackageJson(packageName, updatedPackageJson);
    }

    return convertedCount;
  }

  /**
   * Check if package has script
   */
  public hasScript(packageName: string, scriptName: string): boolean {
    const pkg = this.packages.get(packageName);
    if (!pkg) return false;

    return !!(pkg.packageJson.scripts && pkg.packageJson.scripts[scriptName]);
  }

  /**
   * Get package scripts
   */
  public getPackageScripts(packageName: string): string[] {
    const pkg = this.packages.get(packageName);
    if (!pkg || !pkg.packageJson.scripts) return [];

    return Object.keys(pkg.packageJson.scripts);
  }

  /**
   * Get all discovered Olane package names
   */
  public getOlanePackageNames(): string[] {
    const olanePackages: string[] = [];

    for (const pkg of this.packages.values()) {
      if (pkg.name.startsWith('@olane/')) {
        olanePackages.push(pkg.name);
      }
    }

    return olanePackages;
  }
}

// Export a default instance for convenience
export function createPackageManager(scriptDir?: string): PackageManager {
  return new PackageManager(scriptDir);
}
