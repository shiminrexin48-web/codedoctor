import type { Finding, ProjectFile, ProjectFileIndex, ProjectType } from '@codedoctor/shared';

export interface BrowserProjectFile extends ProjectFile {
  content: string;
}
export interface BrowserProject {
  rootName: string;
  files: BrowserProjectFile[];
  byPath: Record<string, BrowserProjectFile>;
  ignoredDirectories: string[];
  originalFileCount: number;
  multipleRoots: string[];
  unsupportedArchives: string[];
  skippedLargeTextFiles: string[];
  skippedBinaryFiles: string[];
}

function isFixturePath(path: string): boolean {
  return /(^|\/)(__fixtures__|fixtures?|mocks?|samples?|examples?|demo|demos|testdata|spec-data)(\/|$)/i.test(path) ||
    /(\.test\.|\.spec\.|\.fixture\.|\.mock\.)/i.test(path) ||
    /(^|\/)(tests?|specs?)\//i.test(path);
}

export function isGeneratedPath(path: string): boolean {
  return /(^|\/)(dist|dist-ts|build|coverage|\.next|\.nuxt|\.vite|out|target)(\/|$)/i.test(path) ||
    /\.min\.(js|css)$/i.test(path) ||
    /\.map$/i.test(path);
}

function isDocumentationPath(path: string): boolean {
  return /(^|\/)(docs?|documentation|adr)(\/|$)/i.test(path) ||
    /\.(md|mdx|rst)$/i.test(path);
}

export function isProductionSourcePath(path: string): boolean {
  return !isFixturePath(path) && !isGeneratedPath(path) && !isDocumentationPath(path);
}

export function classifyBrowserFile(path: string): NonNullable<ProjectFile['role']> {
  if (isGeneratedPath(path)) return 'generated';
  if (isFixturePath(path)) return 'fixture';
  if (/(\.test\.|\.spec\.)/i.test(path) || /(^|\/)(tests?|specs?)\//i.test(path)) return 'test';
  if (isDocumentationPath(path)) return 'documentation';
  if (/^(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|tsconfig\.json|vite\.config\.[jt]s|\.gitignore|\.env\.example|\.github\/)/i.test(path) || /\.(ya?ml|toml|json)$/i.test(path)) {
    return 'configuration';
  }
  return 'production';
}

export function hasFile(project: BrowserProject, path: string): boolean {
  return Boolean(project.byPath[path]);
}

export function hasAny(project: BrowserProject, paths: string[]): boolean {
  return paths.some((path) => hasFile(project, path));
}

export function hasPrefix(project: BrowserProject, prefix: string): boolean {
  return project.files.some((file) => file.path.startsWith(prefix));
}

export function hasExtension(project: BrowserProject, extension: string): boolean {
  return project.files.some((file) => file.path.endsWith(extension));
}

export function scopeFor(project: BrowserProject): NonNullable<ProjectFileIndex['scope']> {
  const count = (role: ProjectFile['role']) => project.files.filter((file) => file.role === role).length;
  return {
    totalFiles: project.files.length,
    scannedFiles: project.files.filter((file) => file.role !== 'generated').length,
    productionFiles: count('production'),
    testFiles: count('test'),
    fixtureFiles: count('fixture'),
    generatedFiles: count('generated'),
    documentationFiles: count('documentation'),
    configurationFiles: count('configuration'),
    ignoredDirectories: project.ignoredDirectories
  };
}

export function createFinding(input: Omit<Finding, 'id' | 'tags' | 'applicableProjectTypes' | 'fixComplexity' | 'aiExplainable'> & {
  tags?: string[];
  applicableProjectTypes?: ProjectType[];
  fixComplexity?: Finding['fixComplexity'];
  aiExplainable?: boolean;
}): Finding {
  const basis = `${input.sourceAnalyzer}:${input.ruleId}:${input.filePath ?? 'project'}:${input.startLine ?? 0}:${input.title}`;
  return {
    id: btoa(unescape(encodeURIComponent(basis))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24),
    tags: [],
    applicableProjectTypes: ['generic'],
    fixComplexity: 'easy',
    aiExplainable: true,
    trust: {
      whyMatched: input.evidence.join(' '),
      falsePositiveRisk: input.confidence >= 0.85 ? 'low' : input.confidence >= 0.7 ? 'medium' : 'high',
      scope: input.filePath ? classifyBrowserFile(input.filePath) : 'project'
    },
    ...input
  };
}

export function lineInfo(content: string, index: number): { line: number; snippet: string } {
  const line = content.slice(0, index).split(/\r?\n/).length;
  return {
    line,
    snippet: content.split(/\r?\n/)[line - 1]?.trim() ?? ''
  };
}

export function findDevelopmentMarker(content: string): { index: number; marker: string } | null {
  const comments = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*/g;
  for (const comment of content.matchAll(comments)) {
    const marker = comment[0].match(/\b(TODO|FIXME|HACK)\b/i);
    if (marker?.index !== undefined && comment.index !== undefined) {
      return { index: comment.index + marker.index, marker: marker[0] };
    }
  }
  return null;
}
