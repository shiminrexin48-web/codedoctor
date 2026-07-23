import type {
  AnalyzerResult,
  CodeDoctorReport,
  DetectionEvidence,
  Finding,
  FindingCategory,
  FindingSeverity,
  Framework,
  Language,
  PackageManager,
  ProjectMaturityReport,
  ProjectProfile,
  ProjectFile,
  ProjectFileIndex,
  ProjectType,
  ScoreDimension,
  ScoreReport
} from '@codedoctor/shared';
import { assertScanInput, scanProgress, throwIfAborted, type ScanProgress } from './scanPolicy.js';
import {
  classifyBrowserFile,
  hasAny,
  hasExtension,
  hasFile,
  hasPrefix,
  scopeFor,
  type BrowserProject,
  type BrowserProjectFile
} from './browserProject.js';
import { runBrowserAnalyzers } from './browserAnalyzers.js';

export interface BrowserScanOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ScanProgress) => void;
}


const MAX_TEXT_FILE_SIZE = 512_000;

const textExtensions = [
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
  '.css',
  '.html',
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
  '.go',
  '.rs',
  '.csproj',
  '.sln',
  '.sh'
];

const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz'];

const severityPenalty: Record<FindingSeverity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1
};

const dimensionCategories: Record<keyof ScoreReport['scores'], FindingCategory[]> = {
  projectHygiene: ['docs', 'config', 'architecture'],
  security: ['security'],
  maintainability: ['maintainability', 'architecture', 'bug'],
  test: ['test'],
  dependency: ['dependency'],
  buildAndRun: ['build', 'config'],
  aiCodingRisk: ['ai-smell'],
  frameworkSpecific: ['architecture', 'config', 'dependency']
};

const scoreWeights: Record<keyof ScoreReport['scores'], number> = {
  projectHygiene: 15, security: 15, maintainability: 15, test: 15,
  dependency: 10, buildAndRun: 15, frameworkSpecific: 10, aiCodingRisk: 5
};

function isTextPath(path: string): boolean {
  return textExtensions.some((extension) => path.endsWith(extension)) || path.includes('.env');
}


function normalizeBrowserPath(file: File): string {
  const withRelativePath = file as File & { webkitRelativePath?: string };
  return (withRelativePath.webkitRelativePath || file.name).split('/').filter(Boolean).join('/');
}

function archivePath(path: string): boolean {
  return archiveExtensions.some((extension) => path.toLowerCase().endsWith(extension));
}

function parseIgnorePatterns(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
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

async function readBrowserProject(fileList: FileList | File[], options: BrowserScanOptions = {}): Promise<BrowserProject> {
  assertScanInput(fileList);
  const inputFiles = Array.from(fileList).map((file) => ({
    file,
    normalized: normalizeBrowserPath(file),
    hasDirectoryPath: Boolean((file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim())
  }));
  const hasReliableDirectoryPaths = inputFiles.length > 0 && inputFiles.every((item) => item.hasDirectoryPath);
  const roots = new Set(hasReliableDirectoryPaths ? inputFiles.map((item) => item.normalized.split('/')[0]).filter(Boolean) : []);
  const stripSingleRoot = hasReliableDirectoryPaths && roots.size === 1 && inputFiles.every((item) => item.normalized.split('/').length > 1);
  const rootName = !hasReliableDirectoryPaths ? 'browser-project' : roots.size === 1 ? [...roots][0] : roots.size > 1 ? 'multiple-projects' : 'browser-project';
  const pathEntries = inputFiles.map((item) => ({
    ...item,
    path: stripSingleRoot ? item.normalized.split('/').slice(1).join('/') : item.normalized
  }));
  const ignoreFile = pathEntries.find((item) => item.path === '.codedoctorignore');
  const ignorePatterns = ignoreFile ? parseIgnorePatterns(await ignoreFile.file.text()) : [];
  const files: BrowserProjectFile[] = [];
  const ignoredDirectories = new Set<string>();
  const unsupportedArchives = new Set<string>();
  const skippedLargeTextFiles = new Set<string>();
  const skippedBinaryFiles = new Set<string>();

  for (let fileIndex = 0; fileIndex < pathEntries.length; fileIndex += 1) {
    throwIfAborted(options.signal);
    const { file, path } = pathEntries[fileIndex];
    options.onProgress?.(scanProgress(fileIndex, pathEntries.length, path));
    if (matchesIgnorePattern(path, ignorePatterns)) {
      if (!path.includes('.')) {
        ignoredDirectories.add(path.replace(/\/$/, ''));
      }
      continue;
    }
    const parts = path.split('/');
    const ignoredIndex = parts.findIndex((part) => part === 'node_modules' || part === '.codedoctor');
    if (ignoredIndex >= 0) {
      ignoredDirectories.add(parts.slice(0, ignoredIndex + 1).join('/'));
    }
    if (
      !path ||
      path.includes('/node_modules/') ||
      path.startsWith('node_modules/') ||
      path.includes('/.codedoctor/') ||
      path.startsWith('.codedoctor/')
    ) {
      continue;
    }
    if (archivePath(path)) {
      unsupportedArchives.add(path);
      continue;
    }

    const isText = isTextPath(path);
    if (isText && file.size > MAX_TEXT_FILE_SIZE) {
      skippedLargeTextFiles.add(path);
    }
    if (!isText) {
      skippedBinaryFiles.add(path);
    }
    const content = isText && file.size <= MAX_TEXT_FILE_SIZE ? await file.text() : '';
    files.push({
      path,
      absolutePath: path,
      size: file.size,
      role: classifyBrowserFile(path),
      content
    });
  }
  options.onProgress?.(scanProgress(pathEntries.length, pathEntries.length));

  return {
    rootName,
    files,
    byPath: Object.fromEntries(files.map((file) => [file.path, file])),
    ignoredDirectories: [...ignoredDirectories],
    originalFileCount: inputFiles.length,
    multipleRoots: hasReliableDirectoryPaths && roots.size > 1 ? [...roots] : [],
    unsupportedArchives: [...unsupportedArchives],
    skippedLargeTextFiles: [...skippedLargeTextFiles],
    skippedBinaryFiles: [...skippedBinaryFiles]
  };
}

function detect(project: BrowserProject) {
  const detectedTypes = new Set<ProjectType>(['generic']);
  const languages = new Set<Language>();
  const frameworks = new Set<Framework>();
  const packageManagers = new Set<PackageManager>();
  const evidence: DetectionEvidence[] = [];
  const recommendedAnalyzers = new Set(['universal', 'secret', 'test', 'ai-coding-smell']);

  if (hasFile(project, 'package.json')) {
    detectedTypes.add('node-web');
    languages.add('javascript');
    packageManagers.add(hasFile(project, 'pnpm-lock.yaml') ? 'pnpm' : hasFile(project, 'yarn.lock') ? 'yarn' : 'npm');
    recommendedAnalyzers.add('node-dependency');
    evidence.push({ type: 'file', path: 'package.json', description: '发现 Node 包清单', weight: 0.35 });
  }
  if (hasAny(project, ['tsconfig.json']) || hasExtension(project, '.ts') || hasExtension(project, '.tsx')) {
    languages.add('typescript');
    evidence.push({ type: 'file', path: 'tsconfig.json or .ts files', description: '发现 TypeScript 证据', weight: 0.14 });
  }
  if (hasAny(project, ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'])) {
    frameworks.add('vite');
    evidence.push({ type: 'config', path: 'vite.config', description: '发现 Vite 配置', weight: 0.18 });
  }
  if (project.files.some((file) => file.path.endsWith('.tsx') || file.path.endsWith('.jsx'))) {
    frameworks.add('react');
    evidence.push({ type: 'content', path: '*.tsx or *.jsx', description: '发现 React 组件文件', weight: 0.12 });
  }
  if (project.files.some((file) => file.path.endsWith('.vue'))) {
    frameworks.add('vue');
  }
  if (hasPrefix(project, 'Assets/') && hasPrefix(project, 'ProjectSettings/')) {
    detectedTypes.add('unity');
    languages.add('csharp');
    frameworks.add('unity');
  }
  if (hasExtension(project, '.uproject') || hasExtension(project, '.uplugin')) {
    detectedTypes.add('unreal');
    languages.add('cpp');
    frameworks.add('unreal');
  }
  if (hasAny(project, ['requirements.txt', 'pyproject.toml', 'Pipfile', 'poetry.lock', 'uv.lock', 'manage.py', 'app.py', 'main.py']) || hasExtension(project, '.py')) {
    detectedTypes.add('python');
    languages.add('python');
    packageManagers.add(hasFile(project, 'uv.lock') ? 'uv' : hasFile(project, 'poetry.lock') ? 'poetry' : 'pip');
    recommendedAnalyzers.add('python-project');
    evidence.push({ type: 'file', path: 'python project files', description: '发现 Python 项目证据', weight: 0.25 });
    if (hasFile(project, 'manage.py')) {
      frameworks.add('django');
    }
  }
  if (hasAny(project, ['pom.xml', 'build.gradle', 'build.gradle.kts']) || hasPrefix(project, 'src/main/java/') || hasExtension(project, '.java')) {
    detectedTypes.add('java');
    languages.add('java');
    packageManagers.add(hasFile(project, 'pom.xml') ? 'maven' : 'gradle');
    recommendedAnalyzers.add('java-project');
    evidence.push({ type: 'file', path: 'pom.xml/build.gradle/src/main/java', description: '发现 Java 项目证据', weight: 0.25 });
    if (hasAny(project, ['src/main/resources/application.yml', 'src/main/resources/application.properties', 'application.yml'])) {
      frameworks.add('spring-boot');
    }
  }
  const hasCppSource = ['.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx'].some((extension) => hasExtension(project, extension));
  if (hasCppSource || hasAny(project, ['CMakeLists.txt', 'Makefile', 'makefile', 'conanfile.txt', 'conanfile.py', 'vcpkg.json'])) {
    detectedTypes.add('cpp');
    languages.add('cpp');
    recommendedAnalyzers.add('cpp-project');
    evidence.push({ type: 'file', path: 'CMakeLists/Makefile/C++ source', description: '发现 C/C++ 项目证据', weight: 0.25 });
    if (hasFile(project, 'CMakeLists.txt')) packageManagers.add('cmake');
    if (hasAny(project, ['Makefile', 'makefile'])) packageManagers.add('make');
    if (hasAny(project, ['conanfile.txt', 'conanfile.py'])) packageManagers.add('conan');
    if (hasFile(project, 'vcpkg.json')) packageManagers.add('vcpkg');
  }
  if (hasFile(project, 'go.mod') || hasExtension(project, '.go')) {
    detectedTypes.add('go');
    languages.add('go');
    packageManagers.add('go-mod');
    evidence.push({ type: 'file', path: 'go.mod or *.go', description: '发现 Go 模块或源码', weight: 0.3 });
  }
  if (hasFile(project, 'Cargo.toml') || hasExtension(project, '.rs')) {
    detectedTypes.add('rust');
    languages.add('rust');
    packageManagers.add('cargo');
    evidence.push({ type: 'file', path: 'Cargo.toml or *.rs', description: '发现 Rust crate 或源码', weight: 0.3 });
  }
  if (hasExtension(project, '.csproj') || hasExtension(project, '.sln')) {
    detectedTypes.add('dotnet');
    languages.add('csharp');
    packageManagers.add('dotnet');
    evidence.push({ type: 'file', path: '*.csproj or *.sln', description: '发现 .NET 工程', weight: 0.3 });
  }
  if (hasAny(project, ['README.md', 'README', 'readme.md'])) {
    evidence.push({ type: 'file', path: 'README', description: '发现项目说明文档', weight: 0.1 });
  }

  const confidence = Math.max(0.35, Math.min(0.98, evidence.reduce((sum, item) => sum + item.weight, 0)));
  const fileIndex: ProjectFileIndex = {
    files: project.files.map(({ content: _content, ...file }) => file),
    byPath: Object.fromEntries(project.files.map(({ content: _content, ...file }) => [file.path, file])),
    ignoredDirectories: project.ignoredDirectories,
    scope: scopeFor(project)
  };

  return {
    rootPath: project.rootName,
    detectedTypes: [...detectedTypes],
    languages: languages.size ? [...languages] : (['unknown'] satisfies Language[]),
    frameworks: frameworks.size ? [...frameworks] : (['unknown'] satisfies Framework[]),
    packageManagers: packageManagers.size ? [...packageManagers] : (['unknown'] satisfies PackageManager[]),
    confidence,
    evidence,
    recommendedAnalyzers: [...recommendedAnalyzers],
    unsupportedAreas: [],
    files: fileIndex
  };
}

function profileBrowserProject(project: BrowserProject, context: ReturnType<typeof detect>): ProjectProfile {
  const paths = project.files.map((file) => file.path);
  const has = (pattern: RegExp) => paths.some((path) => pattern.test(path));
  if (context.detectedTypes.includes('unity')) {
    return { primaryPurpose: 'unity-project', displayName: 'Unity 项目', confidence: 0.99, candidates: ['unity-project'], evidence: ['发现 Assets 与 ProjectSettings。'], eligibility: { status: 'ineligible', reasons: ['Unity 项目依赖专用编辑器，当前网页版本不提供正式评分。'] } };
  }
  if (context.detectedTypes.includes('unreal')) {
    return { primaryPurpose: 'unreal-project', displayName: 'Unreal Engine 项目', confidence: 0.99, candidates: ['unreal-project'], evidence: ['发现 .uproject 或 .uplugin。'], eligibility: { status: 'ineligible', reasons: ['Unreal Engine 项目依赖专用引擎和构建工具，当前网页版本不提供正式评分。'] } };
  }
  if (project.multipleRoots.length > 1) {
    return { primaryPurpose: 'monorepo', displayName: '多个项目混合导入', confidence: 0.72, candidates: ['monorepo'], evidence: [`发现 ${project.multipleRoots.length} 个顶层目录。`], eligibility: { status: 'limited', reasons: ['当前分数混合了多个顶层目录，仅供初步参考；建议一次导入一个项目根目录。'] } };
  }
  const candidates: ProjectProfile['candidates'] = [];
  const evidence: string[] = [];
  const add = (purpose: ProjectProfile['primaryPurpose'], reason: string) => { if (!candidates.includes(purpose)) candidates.push(purpose); evidence.push(reason); };
  if (has(/(^|\/)(pnpm-workspace\.yaml|lerna\.json|nx\.json|turbo\.json)$/)) add('monorepo', '发现工作区清单。');
  if (has(/(^|\/)(src\/)?cli\.[cm]?[jt]s$/i) || has(/(^|\/)(bin|commands?)\//) || has(/(^|\/)cmd\/[^/]+\/main\.go$/) || has(/(^|\/)src\/main\.rs$/) || has(/(^|\/)Program\.cs$/)) add('cli', '发现 CLI 入口或命令目录。');
  if (has(/(^|\/)(scripts?|automation|jobs?)\/.*\.(?:py|js|ts|sh)$/i)) add('automation-script', '发现脚本或自动化任务目录。');
  if (has(/(^|\/)(notebooks?|datasets?|pipelines?|models?)\//i) || has(/\.ipynb$/i)) add('data-ml', '发现数据或机器学习工程证据。');
  if (has(/(^|\/)(api|server|controllers?|routes?)\//i) || context.frameworks.some((item) => ['spring-boot', 'django', 'fastapi'].includes(item))) add('backend-service', '发现服务端或 API 证据。');
  if (context.frameworks.some((item) => ['react', 'vue', 'next', 'vite'].includes(item)) || has(/(^|\/)index\.html$/)) add('web-frontend', '发现 Web 页面或框架证据。');
  if (has(/(^|\/)(include|lib)\//) || has(/(^|\/)src\/lib\//)) add('library-sdk', '发现库或公共头文件结构。');
  if (has(/(^|\/)(Dockerfile|docker-compose\.ya?ml|terraform|k8s|helm)($|\/)/i) || has(/\.tf$/)) add('infrastructure', '发现基础设施配置。');
  if (candidates.length === 0) add('generic-source', '发现源码，但用途入口不足。');
  const primaryPurpose = candidates[0] ?? 'generic-source';
  const language = context.languages.find((item) => item !== 'unknown');
  const labels: Partial<Record<ProjectProfile['primaryPurpose'], string>> = { cli: 'CLI 命令行工具', 'automation-script': '脚本/自动化工具', 'data-ml': '数据处理/机器学习', 'backend-service': '后端服务/API', 'web-frontend': 'Web 前端', 'library-sdk': '库/SDK', monorepo: 'Monorepo', infrastructure: '基础设施工程', 'generic-source': '通用源码项目' };
  const eligibility = context.languages.every((item) => item === 'unknown') || primaryPurpose === 'generic-source'
    ? { status: 'limited' as const, reasons: ['源码用途或语言证据不足，仅提供有限静态评估。'] }
    : { status: 'eligible' as const, reasons: ['已识别受支持源码语言和项目用途。'] };
  return { primaryPurpose, displayName: `${language ? `${language} ` : ''}${labels[primaryPurpose] ?? '源码项目'}`, confidence: Math.min(0.95, 0.5 + evidence.length * 0.15), candidates, evidence, eligibility };
}

function scoreDimension(name: keyof ScoreReport['scores'], findings: Finding[], confidence: ScoreDimension['confidence']): ScoreDimension {
  const categories = dimensionCategories[name];
  const relevant = findings.filter((finding) => categories.includes(finding.category));
  const penalty = relevant.reduce((sum, finding) => sum + severityPenalty[finding.severity] * Math.max(0.5, Math.min(1, finding.confidence)), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const weight = scoreWeights[name];
  return {
    score,
    confidence,
    findingCount: relevant.length,
    weight,
    contribution: Math.round(score * weight) / 100,
    deduction: 100 - score,
    weightedDeduction: Math.round((100 - score) * weight) / 100,
    verified: name !== 'buildAndRun' && confidence !== 'low',
    explanation: name === 'buildAndRun'
      ? '仅完成静态构建配置检查，网页未执行真实安装、构建或启动命令。'
      : relevant.length === 0 ? 'No matching findings were produced.' : `${relevant.length} finding(s) affected this dimension.`
  };
}

function scoreReport(findings: Finding[], analyzerResults: AnalyzerResult[], detectedTypes: ProjectType[], profile: ProjectProfile): ScoreReport {
  const hasLanguageAnalyzer = ['node-web', 'python', 'java', 'cpp'].some((type) => detectedTypes.includes(type as ProjectType));
  const scores = Object.fromEntries(
    (Object.keys(dimensionCategories) as Array<keyof ScoreReport['scores']>).map((dimension) => [
      dimension,
      scoreDimension(dimension, findings, dimension === 'security' || (hasLanguageAnalyzer && ['dependency', 'buildAndRun'].includes(dimension)) ? 'high' : 'medium')
    ])
  ) as ScoreReport['scores'];
  const overallScore = profile.eligibility.status === 'ineligible' ? 0 : Math.round(Object.values(scores).reduce((sum, dimension) => sum + (dimension.contribution ?? 0), 0));
  return {
    overallScore,
    maximumScore: 100,
    profile,
    eligibility: profile.eligibility,
    scores,
    coverage: {
      enabledAnalyzers: analyzerResults.filter((result) => !result.skipped).map((result) => result.analyzerId),
      disabledAnalyzers: analyzerResults.filter((result) => result.skipped).map((result) => result.analyzerId),
      unsupportedAnalyzers: [],
      confidence: 1,
      notes: [
        `Detected project types: ${detectedTypes.join(', ')}.`,
        hasLanguageAnalyzer
          ? 'Browser scanner enabled stack-aware checks for detected Node/Python/Java/C/C++ project evidence.'
          : 'This scan mainly reflects universal project checks for the detected project type.'
      ]
    }
  };
}

function summary(findings: Finding[]): CodeDoctorReport['summary'] {
  return {
    findingCount: findings.length,
    criticalCount: findings.filter((finding) => finding.severity === 'critical').length,
    highCount: findings.filter((finding) => finding.severity === 'high').length,
    mediumCount: findings.filter((finding) => finding.severity === 'medium').length,
    lowCount: findings.filter((finding) => finding.severity === 'low').length,
    infoCount: findings.filter((finding) => finding.severity === 'info').length
  };
}

function assessBrowserMaturity(context: ReturnType<typeof detect>): ProjectMaturityReport {
  const has = (pattern: RegExp) => context.files.files.some((file) => pattern.test(file.path));
  const checks: ProjectMaturityReport['checks'] = [
    { id: 'readme', label: 'README', passed: has(/^readme(\.md)?$/i), weight: 12, evidence: 'Root README exists.', recommendation: 'Add README with setup, run, and test instructions.' },
    { id: 'license', label: 'License', passed: has(/^license(\.md|\.txt)?$/i), weight: 8, evidence: 'License exists.', recommendation: 'Add a LICENSE file.' },
    { id: 'ci', label: 'CI', passed: has(/^\.github\/workflows\/.+\.ya?ml$/i), weight: 14, evidence: 'CI workflow exists.', recommendation: 'Add CI workflow for test and build.' },
    { id: 'tests', label: 'Tests', passed: has(/(\.test\.|\.spec\.|^tests?\/)/i), weight: 14, evidence: 'Tests are visible.', recommendation: 'Add automated tests.' },
    { id: 'lockfile', label: 'Reproducible dependencies', passed: has(/(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|poetry\.lock|uv\.lock|Pipfile\.lock)$/), weight: 12, evidence: 'Lockfile exists.', recommendation: 'Commit a package manager lockfile.' },
    { id: 'security', label: 'Security policy', passed: has(/^(security\.md|\.github\/SECURITY\.md)$/i), weight: 10, evidence: 'Security policy exists.', recommendation: 'Add SECURITY.md.' },
    { id: 'contributing', label: 'Contribution guide', passed: has(/^(contributing\.md|\.github\/CONTRIBUTING\.md)$/i), weight: 8, evidence: 'Contribution guide exists.', recommendation: 'Add CONTRIBUTING.md.' },
    { id: 'code-of-conduct', label: 'Code of conduct', passed: has(/^(?:\.github\/|docs\/)?code_of_conduct\.md$/i), weight: 4, evidence: 'Community behavior expectations are documented.', recommendation: 'Add CODE_OF_CONDUCT.md.' },
    { id: 'issue-template', label: 'Issue templates', passed: has(/^\.github\/ISSUE_TEMPLATE\/.+\.(?:md|ya?ml)$/i), weight: 4, evidence: 'Structured issue intake exists.', recommendation: 'Add bug and feature issue forms.' },
    { id: 'pr-template', label: 'Pull request template', passed: has(/^(?:\.github\/|docs\/)?pull_request_template\.md$/i), weight: 4, evidence: 'Pull requests have a verification checklist.', recommendation: 'Add a pull request template.' },
    { id: 'changelog', label: 'Changelog', passed: has(/^(changelog|changes|history)\.md$/i), weight: 4, evidence: 'User-visible changes are tracked.', recommendation: 'Add CHANGELOG.md.' },
    { id: 'dependency-automation', label: 'Dependency automation', passed: has(/^\.github\/dependabot\.ya?ml$/i) || has(/^(renovate\.json|\.renovaterc(?:\.json)?)$/i), weight: 4, evidence: 'Automated dependency updates are configured.', recommendation: 'Configure Dependabot or Renovate.' },
    { id: 'env-example', label: 'Environment example', passed: has(/^\.env\.example$/), weight: 8, evidence: 'Environment example exists.', recommendation: 'Add .env.example.' },
    { id: 'ignore', label: 'Ignore policy', passed: has(/^(\.gitignore|\.codedoctorignore)$/), weight: 8, evidence: 'Ignore policy exists.', recommendation: 'Add .gitignore and .codedoctorignore.' },
    { id: 'entrypoint', label: 'Runnable entry', passed: has(/(^|\/)(package\.json|pyproject\.toml|pom\.xml|build\.gradle|CMakeLists\.txt)$/), weight: 6, evidence: 'Standard manifest exists.', recommendation: 'Add a standard manifest or documented entrypoint.' }
  ];
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.filter((check) => check.passed).reduce((sum, check) => sum + check.weight, 0);
  return { score: Math.round((earned / total) * 100), checks };
}

export async function scanBrowserProject(fileList: FileList | File[], options: BrowserScanOptions = {}): Promise<CodeDoctorReport> {
  const project = await readBrowserProject(fileList, options);
  throwIfAborted(options.signal);
  const context = detect(project);
  const profile = profileBrowserProject(project, context);
  const analyzerResults = runBrowserAnalyzers(project);
  const findings = analyzerResults.flatMap((result) => result.findings);
  const score = scoreReport(findings, analyzerResults, context.detectedTypes, profile);
  return {
    version: '0.1.0-browser',
    generatedAt: new Date().toISOString(),
    context,
    analyzerResults,
    findings,
    score,
    summary: summary(findings),
    maturity: assessBrowserMaturity(context)
  };
}
