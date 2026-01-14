# @auto-tauri/framework

Share Tauri app wrapper and agent binaries across projects.

## Features

- **Cross-platform binary selection** - Automatically detects OS and architecture
- **XHS Agent integration** - Publish content to Xiaohongshu (小红书)
- **HyperAgent support** - Run automation agents
- **TypeScript support** - Full type definitions included

## Installation

```bash
npm install @auto-tauri/framework
```

## Quick Start

```typescript
import { createFramework } from '@auto-tauri/framework';

const framework = createFramework('/path/to/binaries');

// Publish to Xiaohongshu
const result = await framework.publishToXHS({
  imagePath: '/path/to/image.png',
  title: 'My Title',
  content: 'My content here'
});

console.log(result.success);

// Run hyperagent
const agentResult = await framework.runHyperagent('status');
```

## API Reference

### createFramework(binariesDir?: string)

Create a new framework instance with optional custom binaries directory.

```typescript
const framework = createFramework('/custom/binaries/path');
```

### publishToXHS(options)

Publish content to Xiaohongshu.

```typescript
interface PublishOptions {
  imagePath: string;
  title: string;
  content: string;
  taskId?: string;
  timeout?: number;
}

const result = await framework.publishToXHS({
  imagePath: '/path/to/image.png',
  title: 'Title',
  content: 'Content'
});
```

### runHyperagent(command, options)

Run a hyperagent command.

```typescript
interface AgentOptions {
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}

const result = await framework.runHyperagent('status', {
  timeout: 30000
});
```

### runHyperagentInteractive(command, options)

Run hyperagent with interactive terminal (stdio: inherit).

```typescript
const process = await framework.runHyperagentInteractive('shell');
```

## Platform Support

| Platform | x64 | arm64 |
|----------|-----|-------|
| macOS    | ✅  | ✅   |
| Windows  | ✅  | -    |
| Linux    | ✅  | ✅   |

## Binary Naming Convention

Binaries follow the pattern: `{name}-{target}.{ext}`

Examples:
- `xhs-agent-aarch64-apple-darwin` (macOS ARM)
- `xhs-agent-x86_64-apple-darwin` (macOS Intel)
- `xhs-agent-x86_64-pc-windows-msvc` (Windows)
- `xhs-agent-x86_64-unknown-linux-gnu` (Linux)
- `hyperagent-aarch64-apple-darwin` (macOS ARM)

## Directory Structure

```
your-project/
├── node_modules/
│   └── @auto-tauri/framework/
│       ├── dist/
│       │   ├── index.js
│       │   ├── index.d.ts
│       │   └── platform.js
│       └── binaries/
│           ├── xhs-agent-aarch64-apple-darwin
│           ├── xhs-agent-x86_64-apple-darwin
│           ├── xhs-agent-x86_64-pc-windows-msvc.exe
│           ├── xhs-agent-x86_64-unknown-linux-gnu
│           ├── hyperagent-aarch64-apple-darwin
│           └── ...
├── src/
│   └── index.ts
└── package.json
```

## Integrating with Tauri

If using with Tauri, you can expose the framework through Rust commands:

```rust
// src-tauri/src/lib.rs
use tauri::Manager;

#[tauri::command]
async fn publish_xhs(image_path: String, title: String, content: String, window: tauri::Window) -> Result<(), String> {
    let framework = // ... initialize framework
    framework.publish_to_xhs(&image_path, &title, &content)
        .await
        .map_err(|e| e.to_string())
}
```

## License

MIT
