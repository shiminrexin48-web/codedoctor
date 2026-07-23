import { scanBrowserProject } from './clientScanner.js';

self.onmessage = async (event: MessageEvent<{ files: File[] }>) => {
  try {
    const report = await scanBrowserProject(event.data.files, {
      onProgress: (progress) => self.postMessage({ type: 'progress', progress })
    });
    self.postMessage({ type: 'complete', report });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '项目扫描失败' });
  }
};
