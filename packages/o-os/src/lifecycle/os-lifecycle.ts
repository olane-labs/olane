import { OlaneOS } from '../o-olane-os/o-os.js';
import { OlaneOSConfig } from '../o-olane-os/interfaces/o-os.config.js';
import { OlaneOSSystemStatus } from '../o-olane-os/enum/o-os.status-enum.js';
import { ConfigManager, OlaneOSInstanceConfig } from '../utils/config.js';

export interface OSStartResult {
  peerId: string;
  transports: string[];
  instanceName: string;
  pid: number;
}

/**
 * Start an OlaneOS instance and persist its PID/state.
 * If an instance with this name is already running, stops it first.
 */
export async function startOS(
  instanceName: string,
  osConfig: OlaneOSConfig,
): Promise<{ os: OlaneOS; result: OSStartResult }> {
  // Check for an existing running instance and clean up
  const existing = await ConfigManager.getOSConfig(instanceName);
  if (existing?.pid && isProcessAlive(existing.pid) && existing.pid !== process.pid) {
    process.kill(existing.pid, 'SIGTERM');
    await ConfigManager.updateOSConfig({
      ...existing,
      status: OlaneOSSystemStatus.STOPPED,
      pid: undefined,
    });
  }

  const os = new OlaneOS(osConfig);
  const { peerId, transports } = await os.start();

  const instanceConfig: OlaneOSInstanceConfig = {
    name: instanceName,
    version: osConfig.network?.version || '0.0.1',
    description: osConfig.network?.description || '',
    port: osConfig.network?.port || 0,
    status: OlaneOSSystemStatus.RUNNING,
    createdAt: new Date().toISOString(),
    pid: process.pid,
    peerId,
    transports: transports.map((t) => String(t)),
    oNetworkConfig: osConfig,
  };
  await ConfigManager.saveOSConfig(instanceConfig);

  const result: OSStartResult = {
    peerId,
    transports: instanceConfig.transports || [],
    instanceName,
    pid: process.pid,
  };

  return { os, result };
}

/**
 * Stop a running OS instance by name. Sends SIGTERM to its PID.
 */
export async function stopOS(instanceName: string): Promise<boolean> {
  const config = await ConfigManager.getOSConfig(instanceName);
  if (!config) {
    return false;
  }

  if (config.pid && isProcessAlive(config.pid)) {
    process.kill(config.pid, 'SIGTERM');
  }

  await ConfigManager.updateOSConfig({
    ...config,
    status: OlaneOSSystemStatus.STOPPED,
    pid: undefined,
  });

  return true;
}

/**
 * Check liveness of an OS instance by name.
 */
export async function statusOS(
  instanceName: string,
): Promise<{ config: OlaneOSInstanceConfig; alive: boolean } | null> {
  const config = await ConfigManager.getOSConfig(instanceName);
  if (!config) {
    return null;
  }

  const alive = config.pid ? isProcessAlive(config.pid) : false;

  // Clean up stale status
  if (!alive && config.status === OlaneOSSystemStatus.RUNNING) {
    await ConfigManager.updateOSConfig({
      ...config,
      status: OlaneOSSystemStatus.STOPPED,
      pid: undefined,
    });
    config.status = OlaneOSSystemStatus.STOPPED;
    config.pid = undefined;
  }

  return { config, alive };
}

/**
 * List all instances with live PID checks.
 */
export async function listOS(): Promise<
  Array<{ config: OlaneOSInstanceConfig; alive: boolean }>
> {
  const instances = await ConfigManager.listOSInstances();
  return instances.map((config) => ({
    config,
    alive: config.pid ? isProcessAlive(config.pid) : false,
  }));
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
