import { readFile } from 'node:fs/promises';
import type { Finding, FindingCategory, FindingSeverity, ProjectContext, ProjectFile, ProjectType } from '@codedoctor/shared';

export const TEXT_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.toml',
  '.yml',
  '.yaml',
  '.env',
  '.py',
  '.java',
  '.cs',
  '.c',
  '.cc',
  '.cpp',
  '.cxx',
  '.h',
  '.hh',
  '.hpp',
  '.hxx',
  '.csproj',
  '.gradle',
  '.xml',
  '.sh'
];

export function finding(input: {
  title: string;
  description: string;
  severity: FindingSeverity;
  category: FindingCategory;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  codeSnippet?: string;
  evidence: string[];
  recommendation: string;
  sourceAnalyzer: string;
  ruleId: string;
  confidence: number;
  tags?: string[];
  applicableProjectTypes?: ProjectType[];
  fixComplexity?: 'easy' | 'medium' | 'hard';
  aiExplainable?: boolean;
  trust?: Finding['trust'];
}): Finding {
  const basis = `${input.sourceAnalyzer}:${input.ruleId}:${input.filePath ?? 'project'}:${input.startLine ?? 0}:${input.title}`;
  return {
    id: Buffer.from(basis).toString('base64url').slice(0, 24),
    tags: [],
    applicableProjectTypes: ['generic'],
    fixComplexity: 'easy',
    aiExplainable: true,
    trust: input.trust ?? {
      whyMatched: input.evidence.join(' '),
      falsePositiveRisk: input.confidence >= 0.85 ? 'low' : input.confidence >= 0.7 ? 'medium' : 'high',
      scope: input.filePath ? inferRoleFromPath(input.filePath) : 'project'
    },
    ...input
  };
}

export function inferRoleFromPath(path: string): NonNullable<ProjectFile['role']> {
  if (isGeneratedPath(path)) return 'generated';
  if (isFixturePath(path)) return 'fixture';
  if (/(\.test\.|\.spec\.)/i.test(path) || /(^|\/)(tests?|specs?)\//i.test(path)) return 'test';
  if (isDocumentationPath(path)) return 'documentation';
  if (/^(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|tsconfig\.json|vite\.config\.[jt]s|\.gitignore|\.env\.example|\.github\/)/i.test(path) || /\.(ya?ml|toml|json)$/i.test(path)) return 'configuration';
  return 'production';
}

export function isTextFile(path: string): boolean {
  return TEXT_EXTENSIONS.some((extension) => path.endsWith(extension)) || path.includes('.env');
}

export function isFixturePath(path: string): boolean {
  return /(^|\/)(__fixtures__|fixtures?|mocks?|samples?|examples?|demo|demos|testdata|spec-data)(\/|$)/i.test(path) ||
    /(\.test\.|\.spec\.|\.fixture\.|\.mock\.)/i.test(path) ||
    /(^|\/)(tests?|specs?)\//i.test(path);
}

export function isGeneratedPath(path: string): boolean {
  return /(^|\/)(dist|dist-ts|build|coverage|\.next|\.nuxt|\.vite|out|target)(\/|$)/i.test(path) ||
    /\.min\.(js|css)$/i.test(path) ||
    /\.map$/i.test(path);
}

export function isDocumentationPath(path: string): boolean {
  return /(^|\/)(docs?|documentation|adr)(\/|$)/i.test(path) ||
    /\.(md|mdx|rst)$/i.test(path);
}

export function isProductionSourcePath(path: string): boolean {
  return !isFixturePath(path) && !isGeneratedPath(path) && !isDocumentationPath(path);
}

export async function readTextFile(file: { absolutePath: string; size: number }): Promise<string | null> {
  if (file.size > 512_000) {
    return null;
  }

  try {
    return await readFile(file.absolutePath, 'utf8');
  } catch {
    return null;
  }
}

export function lineInfo(content: string, index: number): { line: number; snippet: string } {
  const before = content.slice(0, index);
  const line = before.split(/\r?\n/).length;
  const snippet = content.split(/\r?\n/)[line - 1]?.trim() ?? '';
  return { line, snippet };
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

export function hasProjectType(context: ProjectContext, type: ProjectType): boolean {
  return context.detectedTypes.includes(type);
}
