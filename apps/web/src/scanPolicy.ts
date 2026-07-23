export const MAX_PROJECT_FILES = 5_000;
export const MAX_PROJECT_BYTES = 250 * 1024 * 1024;

export interface ScanProgress {
  completed: number;
  total: number;
  percent: number;
  currentPath?: string;
}

export function assertScanInput(files: ArrayLike<{ size: number }>): void {
  if (files.length > MAX_PROJECT_FILES) {
    throw new Error(`项目包含 ${files.length} 个文件，浏览器扫描上限为 ${MAX_PROJECT_FILES} 个。请通过 .codedoctorignore 排除依赖和生成目录。`);
  }
  let totalBytes = 0;
  for (let index = 0; index < files.length; index += 1) totalBytes += files[index]?.size ?? 0;
  if (totalBytes > MAX_PROJECT_BYTES) {
    throw new Error(`项目总体积超过 250 MB。请排除媒体、模型、依赖和构建产物后重试。`);
  }
}

export function scanProgress(completed: number, total: number, currentPath?: string): ScanProgress {
  return {
    completed,
    total,
    percent: total === 0 ? 100 : Math.min(100, Math.round((completed / total) * 100)),
    currentPath
  };
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('扫描已取消', 'AbortError');
}
