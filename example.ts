import { createFramework, getPlatformInfo } from './index';

async function main() {
  console.log('Auto Tauri Framework Example');
  console.log('============================\n');

  const platform = getPlatformInfo();
  console.log('Platform Info:', platform);

  const framework = createFramework();

  console.log('\nBinaries Directory:', framework.getBinariesDir());

  console.log('\n--- Publishing to XHS ---');
  const publishResult = await framework.publishToXHS({
    imagePath: '/tmp/test-image.png',
    title: 'Test Title',
    content: 'Test Content',
    timeout: 120000
  });

  console.log('Publish Result:', publishResult);

  console.log('\n--- Running HyperAgent ---');
  const agentResult = await framework.runHyperagent('status', {
    timeout: 30000
  });

  console.log('Agent Result:', agentResult);
}

main().catch(console.error);
