import * as path from 'path';
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import {
  getPlatformInfo,
  getBinaryName,
  getBinaryExtension,
  PlatformInfo
} from './platform';

export interface ProcessResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface SpawnResult {
  process: ChildProcess;
  stdout: string;
  stderr: string;
}

export interface PublishOptions {
  imagePath: string;
  title: string;
  content: string;
  taskId?: string;
  timeout?: number;
}

export interface AgentOptions {
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}

class AutoTauriFramework {
  private binariesDir: string;

  constructor(binariesDir?: string) {
    this.binariesDir = binariesDir || this.resolveBinariesDir();
  }

  private resolveBinariesDir(): string {
    const possiblePaths = [
      path.join(__dirname, '../../binaries'),
      path.join(__dirname, '../../../binaries'),
      path.join(process.cwd(), 'binaries'),
      path.join(process.cwd(), '../binaries'),
    ];

    for (const p of possiblePaths) {
      try {
        const resolved = path.resolve(p);
        const fs = require('fs');
        if (fs.existsSync(resolved)) {
          return resolved;
        }
      } catch {
        continue;
      }
    }

    throw new Error(`Unable to find binaries directory. Searched: ${possiblePaths.join(', ')}`);
  }

  private getBinaryPath(name: string, platformInfo?: PlatformInfo): string {
    const platform = platformInfo || getPlatformInfo();
    const binaryName = getBinaryName(name, platform);
    const ext = getBinaryExtension();
    const fullName = `${binaryName}${ext}`;

    const fullPath = path.join(this.binariesDir, fullName);
    
    const fs = require('fs');
    if (!fs.existsSync(fullPath)) {
      throw new Error(
        `Binary not found: ${fullPath}\n` +
        `Platform: ${platform.platform}, Arch: ${platform.arch}\n` +
        `Expected binary: ${fullName}`
      );
    }

    return fullPath;
  }

  private async spawnProcess(
    command: string,
    args: string[],
    options: AgentOptions = {}
  ): Promise<SpawnResult> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 60000;
      let timedOut = false;

      const spawnOptions: SpawnOptions = {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...options.env,
        },
      };

      const process = spawn(command, args, spawnOptions);
      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        timedOut = true;
        process.kill('SIGTERM');
      }, timeout);

      process.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        process.stdout.emit('data', data);
      });

      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        process.stderr.emit('data', data);
      });

      process.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (!timedOut) {
          resolve({ process, stdout, stderr });
        }
      });

      process.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async publishToXHS(options: PublishOptions): Promise<ProcessResult> {
    const platform = getPlatformInfo();
    const binaryPath = this.getBinaryPath('xhs-agent', platform);

    const args = [options.imagePath, options.title, options.content];

    try {
      const { stdout, stderr } = await this.spawnProcess(binaryPath, args, {
        timeout: options.timeout,
      });

      return {
        success: true,
        stdout,
        stderr,
        exitCode: 0,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: -1,
      };
    }
  }

  async runHyperagent(command: string, options: AgentOptions = {}): Promise<ProcessResult> {
    const platform = getPlatformInfo();
    const binaryPath = this.getBinaryPath('hyperagent', platform);

    try {
      const { stdout, stderr } = await this.spawnProcess(binaryPath, [command], {
        timeout: options.timeout,
        env: options.env,
      });

      return {
        success: true,
        stdout,
        stderr,
        exitCode: 0,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: -1,
      };
    }
  }

  async runHyperagentInteractive(
    command: string,
    options: AgentOptions = {}
  ): Promise<ChildProcess> {
    const platform = getPlatformInfo();
    const binaryPath = this.getBinaryPath('hyperagent', platform);

    const spawnOptions: SpawnOptions = {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...options.env,
      },
      shell: true,
    };

    return spawn(binaryPath, [command], spawnOptions);
  }

  getPlatformInfo(): PlatformInfo {
    return getPlatformInfo();
  }

  setBinariesDir(dir: string): void {
    this.binariesDir = dir;
  }

  getBinariesDir(): string {
    return this.binariesDir;
  }
}

export const framework = new AutoTauriFramework();

export function createFramework(binariesDir?: string): AutoTauriFramework {
  return new AutoTauriFramework(binariesDir);
}

export { getPlatformInfo, getBinaryName, getBinaryExtension, PlatformInfo, Arch, Platform } from './platform';
