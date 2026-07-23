import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { ProjectFile, ProjectFileIndex, ScanScope } from '@codedoctor/shared';

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.codedoctor',
  'Library',
  'Temp',
  'DerivedDataCache'
]);

async function readIgnorePatterns(rootPath: string): Promise<string[]> {
  try {
    const content = await readFile(join(rootPath, '.codedoctorignore'), 'utf8');
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

function matchesIgnorePattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const normalized = pattern.replace(/^\//, '').replace(/\/$/, '');
    if (!normalized) {
      return false;
    }
    if (normalized.includes('*')) {
      const escaped = normalized
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '__DOUBLE_STAR__')
        .replace(/\*/g, '[^/]*');
      const expression = escaped.replace(/__DOUBLE_STAR__/g, '.*');
      return pattern.endsWith('/')
        ? new RegExp(`^${expression}(?:/.*)?$`).test(path)
        : new RegExp(`^${expression}$`).test(path);
    }
    if (pattern.endsWith('/')) {
      return path === normalized || path.startsWith(`${normalized}/`);
    }
    return path === normalized || path.startsWith(`${normalized}/`);
  });
}

function classifyFile(path: string): NonNullable<ProjectFile['role']> {
  if (/(^|\/)(dist|dist-ts|build|coverage|\.next|\.nuxt|\.vite|out|target)(\/|$)/i.test(path) || /\.map$/i.test(path) || /\.min\.(js|css)$/i.test(path)) {
    return 'generated';
  }
  if (/(^|\/)(__fixtures__|fixtures?|mocks?|samples?|examples?|demo|demos|testdata|spec-data)(\/|$)/i.test(path) || /(\.fixture\.|\.mock\.)/i.test(path)) {
    return 'fixture';
  }
  if (/(\.test\.|\.spec\.)/i.test(path) || /(^|\/)(tests?|specs?)\//i.test(path)) {
    return 'test';
  }
  if (/(^|\/)(docs?|documentation|adr)(\/|$)/i.test(path) || /\.(md|mdx|rst)$/i.test(path)) {
    return 'documentation';
  }
  if (/^(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|tsconfig\.json|vite\.config\.[jt]s|\.gitignore|\.env\.example|\.github\/)/i.test(path) || /\.(ya?ml|toml|json)$/i.test(path)) {
    return 'configuration';
  }
  return 'production';
}

function scopeFor(files: ProjectFile[], ignoredDirectories: string[]): ScanScope {
  const count = (role: ProjectFile['role']) => files.filter((file) => file.role === role).length;
  return {
    totalFiles: files.length,
    scannedFiles: files.filter((file) => file.role !== 'generated').length,
    productionFiles: count('production'),
    testFiles: count('test'),
    fixtureFiles: count('fixture'),
    generatedFiles: count('generated'),
    documentationFiles: count('documentation'),
    configurationFiles: count('configuration'),
    ignoredDirectories
  };
}

export async function createFileIndex(rootPath: string): Promise<ProjectFileIndex> {
  const files: ProjectFile[] = [];
  const ignoredDirectories = new Set<string>();
  const ignorePatterns = await readIgnorePatterns(rootPath);

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
        const ignoredPath = relative(rootPath, join(dir, entry.name)).split(sep).join('/');
        ignoredDirectories.add(ignoredPath);
        continue;
      }

      const absolutePath = join(dir, entry.name);
      const path = relative(rootPath, absolutePath).split(sep).join('/');
      if (matchesIgnorePattern(path, ignorePatterns)) {
        if (entry.isDirectory()) {
          ignoredDirectories.add(path);
        }
        continue;
      }

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      let info;
      try {
        info = await stat(absolutePath);
      } catch {
        continue;
      }
      files.push({ path, absolutePath, size: info.size, role: classifyFile(path) });
    }
  }

  await walk(rootPath);

  return {
    files,
    byPath: Object.fromEntries(files.map((file) => [file.path, file])),
    ignoredDirectories: [...ignoredDirectories],
    scope: scopeFor(files, [...ignoredDirectories])
  };
}

export function hasFile(index: ProjectFileIndex, path: string): boolean {
  return Boolean(index.byPath[path]);
}

export function hasAnyFile(index: ProjectFileIndex, paths: string[]): boolean {
  return paths.some((path) => hasFile(index, path));
}

export function hasPrefix(index: ProjectFileIndex, prefix: string): boolean {
  return index.files.some((file) => file.path.startsWith(prefix));
}

export function hasExtension(index: ProjectFileIndex, extension: string): boolean {
  return index.files.some((file) => file.path.endsWith(extension));
}
