export type Platform = 'macos' | 'windows' | 'linux';
export type Arch = 'x64' | 'arm64' | 'aarch64';

export interface PlatformInfo {
  platform: Platform;
  arch: Arch;
  isAppleSilicon: boolean;
}

export function getPlatformInfo(): PlatformInfo {
  const platform = process.platform as Platform;
  const arch = process.arch;

  return {
    platform,
    arch: arch === 'arm64' || arch === 'aarch64' ? 'arm64' : 'x64',
    isAppleSilicon: (platform === 'darwin') && (arch === 'arm64')
  };
}

export function getBinaryName(name: string, platformInfo?: PlatformInfo): string {
  const info = platformInfo || getPlatformInfo();
  
  const suffixMap: Record<string, string> = {
    'macos-x64': 'x86_64-apple-darwin',
    'macos-arm64': 'aarch64-apple-darwin',
    'windows-x64': 'x86_64-pc-windows-msvc',
    'linux-x64': 'x86_64-unknown-linux-gnu',
    'linux-arm64': 'aarch64-unknown-linux-gnu',
  };

  const key = `${info.platform}-${info.arch}`;
  const suffix = suffixMap[key] || suffixMap[`${info.platform}-x64`] || 'x86_64-unknown-linux-gnu';
  
  return `${name}-${suffix}`;
}

export function getBinaryExtension(): string {
  const info = getPlatformInfo();
  return info.platform === 'windows' ? '.exe' : '';
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isMacOS(): boolean {
  return process.platform === 'darwin';
}

export function isLinux(): boolean {
  return process.platform === 'linux';
}

export function isArm64(): boolean {
  return process.arch === 'arm64' || process.arch === 'aarch64';
}
