import type { CodeDoctorReport } from '@codedoctor/shared';
import { scanBrowserProject } from './clientScanner.js';
import type { ScanProgress } from './scanPolicy.js';

export interface ScanTask {
  promise: Promise<CodeDoctorReport>;
  cancel(): void;
}

export function startBrowserScan(files: FileList | File[], onProgress: (progress: ScanProgress) => void): ScanTask {
  const list = Array.from(files);
  if (typeof Worker === 'undefined') {
    const controller = new AbortController();
    return {
      promise: scanBrowserProject(list, { signal: controller.signal, onProgress }),
      cancel: () => controller.abort()
    };
  }
  const worker = new Worker(new URL('./scanWorker.ts', import.meta.url), { type: 'module' });
  let rejectTask: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<CodeDoctorReport>((resolve, reject) => {
    rejectTask = reject;
    worker.onmessage = (event: MessageEvent<{ type: string; progress?: ScanProgress; report?: CodeDoctorReport; message?: string }>) => {
      if (event.data.type === 'progress' && event.data.progress) onProgress(event.data.progress);
      if (event.data.type === 'complete' && event.data.report) {
        worker.terminate();
        resolve(event.data.report);
      }
      if (event.data.type === 'error') {
        worker.terminate();
        reject(new Error(event.data.message ?? '项目扫描失败'));
      }
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('后台扫描线程异常终止'));
    };
  });
  worker.postMessage({ files: list });
  return { promise, cancel: () => {
    worker.terminate();
    rejectTask?.(new DOMException('扫描已取消', 'AbortError'));
  } };
}
