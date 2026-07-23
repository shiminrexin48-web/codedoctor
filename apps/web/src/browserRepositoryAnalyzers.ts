import type { AnalyzerResult, Finding } from '@codedoctor/shared';
import {
  createFinding,
  findDevelopmentMarker,
  hasAny,
  hasExtension,
  hasFile,
  hasPrefix,
  isGeneratedPath,
  isProductionSourcePath,
  lineInfo,
  type BrowserProject
} from './browserProject.js';

export function maintainabilityAnalyzer(project: BrowserProject): AnalyzerResult {
  const findings: Finding[] = [];
  const sourcePattern = /\.(?:[cm]?[jt]sx?|py|java|cs|c|cc|cpp|cxx|h|hh|hpp|hxx)$/i;
  for (const file of project.files) {
    if (!sourcePattern.test(file.path) || !isProductionSourcePath(file.path) || !file.content) continue;
    const lines = file.content.split(/\r?\n/).length;
    if (lines < 600) continue;
    findings.push(createFinding({
      title: 'Production source file has too many responsibilities',
      description: 'A very long production source file often combines unrelated state, rules, UI, or I/O responsibilities.',
      severity: lines >= 1000 ? 'medium' : 'low',
      category: 'maintainability',
      filePath: file.path,
      evidence: [`Production source contains ${lines} lines; the review threshold is 600.`],
      recommendation: 'Split the file by business responsibility and protect each extracted unit with focused tests.',
      sourceAnalyzer: 'maintainability',
      ruleId: 'maintainability/oversized-source-file',
      confidence: 0.92,
      tags: ['complexity', 'module-boundary'],
      fixComplexity: 'medium'
    }));
  }
  return { analyzerId: 'maintainability', findings };
}

export function importIntakeAnalyzer(project: BrowserProject): AnalyzerResult {
  const findings: Finding[] = [];
  const readableTextFiles = project.files.filter((file) => file.content.trim().length > 0);

  if (project.originalFileCount === 0 || project.files.length === 0) {
    findings.push(createFinding({
      title: 'No scannable project files were imported',
      description: 'The import did not produce any source files that CodeDoctor can inspect.',
      severity: 'high',
      category: 'config',
      evidence: [`Imported file count: ${project.originalFileCount}.`],
      recommendation: 'Import the unzipped project folder, not an empty folder, shortcut, or generated output directory.',
      sourceAnalyzer: 'import-intake',
      ruleId: 'import/no-scannable-files',
      confidence: 0.92,
      tags: ['import', 'input']
    }));
  }

  if (project.multipleRoots.length > 1) {
    findings.push(createFinding({
      title: 'Multiple project roots were imported together',
      description: 'The selected files appear to come from more than one top-level project.',
      severity: 'medium',
      category: 'config',
      evidence: [`Top-level roots: ${project.multipleRoots.join(', ')}.`],
      recommendation: 'Import one project folder at a time so project type, entry points, and scores are not mixed.',
      sourceAnalyzer: 'import-intake',
      ruleId: 'import/multiple-roots',
      confidence: 0.88,
      tags: ['import', 'project-boundary']
    }));
  }

  for (const archive of project.unsupportedArchives.slice(0, 5)) {
    findings.push(createFinding({
      title: 'Compressed archive was not expanded',
      description: 'Browser scanning cannot inspect the contents of compressed archives directly.',
      severity: 'medium',
      category: 'config',
      filePath: archive,
      evidence: [`Found archive file ${archive}.`],
      recommendation: 'Unzip the archive first, then import the extracted project folder.',
      sourceAnalyzer: 'import-intake',
      ruleId: 'import/archive-not-expanded',
      confidence: 0.9,
      tags: ['import', 'archive']
    }));
  }

  if (project.files.length > 0 && readableTextFiles.length === 0) {
    findings.push(createFinding({
      title: 'No readable source text was found',
      description: 'The import contains files, but none of the supported text source files could be read.',
      severity: 'medium',
      category: 'config',
      evidence: [
        `Readable text files: ${readableTextFiles.length}.`,
        `Binary or unsupported files: ${project.skippedBinaryFiles.length}.`
      ],
      recommendation: 'Import the source folder rather than only media, build artifacts, documents, or binary assets.',
      sourceAnalyzer: 'import-intake',
      ruleId: 'import/no-readable-source',
      confidence: 0.84,
      tags: ['import', 'source']
    }));
  }

  if (project.skippedLargeTextFiles.length > 0) {
    findings.push(createFinding({
      title: 'Large text files were skipped',
      description: 'Some text files were too large for in-browser scanning and were not read.',
      severity: 'info',
      category: 'maintainability',
      evidence: project.skippedLargeTextFiles.slice(0, 5).map((file) => `Skipped ${file}.`),
      recommendation: 'Check whether these are generated files, logs, vendored bundles, or data dumps that should be excluded from source review.',
      sourceAnalyzer: 'import-intake',
      ruleId: 'import/large-text-skipped',
      confidence: 0.75,
      tags: ['import', 'large-file']
    }));
  }

  return { analyzerId: 'import-intake', findings };
}

export function universalAnalyzer(project: BrowserProject): AnalyzerResult {
  const findings: Finding[] = [];
  if (!hasAny(project, ['README.md', 'README', 'readme.md'])) {
    findings.push(createFinding({
      title: 'Missing README',
      description: 'The project has no README file, making setup and expected behavior harder to verify.',
      severity: 'low',
      category: 'docs',
      evidence: ['No README or README.md file found at project root.'],
      recommendation: 'Add a README with setup instructions.',
      sourceAnalyzer: 'universal',
      ruleId: 'universal/readme-missing',
      confidence: 0.85
    }));
  }
  if (!hasFile(project, '.gitignore')) {
    findings.push(createFinding({
      title: 'Missing .gitignore',
      description: 'The project has no .gitignore file.',
      severity: 'medium',
      category: 'config',
      evidence: ['No .gitignore file found at project root.'],
      recommendation: 'Add a .gitignore tailored to the project stack.',
      sourceAnalyzer: 'universal',
      ruleId: 'universal/gitignore-missing',
      confidence: 0.9
    }));
  }
  for (const file of project.files.filter((item) => !isGeneratedPath(item.path))) {
    const marker = findDevelopmentMarker(file.content);
    if (marker) {
      const info = lineInfo(file.content, marker.index);
      findings.push(createFinding({
        title: 'Unresolved development marker',
        description: 'The file contains TODO, FIXME, or HACK markers.',
        severity: 'info',
        category: 'maintainability',
        filePath: file.path,
        startLine: info.line,
        endLine: info.line,
        codeSnippet: info.snippet,
        evidence: [`Found ${marker.marker} marker in a source comment.`],
        recommendation: 'Resolve the marker or convert it into a tracked issue with context.',
        sourceAnalyzer: 'universal',
        ruleId: 'universal/dev-marker',
        confidence: 0.65
      }));
    }
  }
  return { analyzerId: 'universal', findings };
}

export function repositoryHealthAnalyzer(project: BrowserProject): AnalyzerResult {
  const findings: Finding[] = [];
  const paths = project.files.map((file) => file.path);

  const missingSignals = [
    { patterns: [/^license(\.md|\.txt)?$/i], ruleId: 'repo/license-missing', title: 'License file is missing', description: 'The repository has no root LICENSE file.', severity: 'low' as const, category: 'docs' as const, evidence: 'No LICENSE file found at the project root.', recommendation: 'Add a license file when the project is intended to be shared or reused.', confidence: 0.82 },
    { patterns: [/^contributing(\.md|\.txt)?$/i, /^(?:\.github|docs)\/CONTRIBUTING\.md$/i], ruleId: 'repo/contributing-missing', title: 'Contribution guide is missing', description: 'The repository does not explain how others should contribute changes.', severity: 'info' as const, category: 'docs' as const, evidence: 'No CONTRIBUTING.md found in a GitHub-supported location.', recommendation: 'Add CONTRIBUTING.md with setup, tests, rule-quality, and pull request expectations.', confidence: 0.72 },
    { patterns: [/^security\.md$/i, /^\.github\/SECURITY\.md$/i], ruleId: 'repo/security-policy-missing', title: 'Security policy is missing', description: 'The repository has no documented way to report security issues.', severity: 'low' as const, category: 'security' as const, evidence: 'No SECURITY.md found.', recommendation: 'Add SECURITY.md with supported versions and private reporting instructions.', confidence: 0.78 },
    { patterns: [/^(?:\.github\/|docs\/)?code_of_conduct\.md$/i], ruleId: 'repo/code-of-conduct-missing', title: 'Code of conduct is missing', description: 'The repository does not define standards for respectful community participation.', severity: 'info' as const, category: 'docs' as const, evidence: 'No CODE_OF_CONDUCT.md found.', recommendation: 'Add a code of conduct and private enforcement path.', confidence: 0.72 },
    { patterns: [/^\.github\/ISSUE_TEMPLATE\/.+\.(?:md|ya?ml)$/i], ruleId: 'repo/issue-template-missing', title: 'Issue templates are missing', description: 'Contributors are not guided to provide reproducible issue reports.', severity: 'info' as const, category: 'docs' as const, evidence: 'No issue template or issue form found.', recommendation: 'Add structured bug and feature issue forms.', confidence: 0.76 },
    { patterns: [/^(?:\.github\/|docs\/)?pull_request_template\.md$/i, /^(?:\.github\/|docs\/)?PULL_REQUEST_TEMPLATE\/.+\.md$/i], ruleId: 'repo/pr-template-missing', title: 'Pull request template is missing', description: 'Pull requests have no standard place to record scope, validation, and risk.', severity: 'info' as const, category: 'docs' as const, evidence: 'No pull request template found.', recommendation: 'Add a PR template covering verification and remaining risk.', confidence: 0.76 },
    { patterns: [/^changelog\.md$/i, /^changes\.md$/i, /^history\.md$/i], ruleId: 'repo/changelog-missing', title: 'Changelog is missing', description: 'Important user-visible changes are not summarized between versions.', severity: 'info' as const, category: 'docs' as const, evidence: 'No root changelog found.', recommendation: 'Maintain an Unreleased section and versioned release notes.', confidence: 0.68 },
    { patterns: [/^\.github\/dependabot\.ya?ml$/i, /^renovate\.json$/i, /^\.renovaterc(?:\.json)?$/i], ruleId: 'repo/dependency-updates-missing', title: 'Automated dependency updates are not configured', description: 'Dependency updates rely entirely on manual maintenance.', severity: 'info' as const, category: 'dependency' as const, evidence: 'No Dependabot or Renovate configuration found.', recommendation: 'Configure grouped and rate-limited automated updates.', confidence: 0.74 },
    { patterns: [/^\.github\/workflows\/.+\.ya?ml$/i, /(^|\/)(circleci|travis|gitlab-ci|azure-pipelines)/i], ruleId: 'repo/ci-missing', title: 'CI workflow is missing', description: 'No obvious continuous integration workflow was found.', severity: 'medium' as const, category: 'test' as const, evidence: 'No common CI configuration found.', recommendation: 'Add pull-request CI with frozen dependencies and minimal permissions.', confidence: 0.8 }
  ];
  for (const signal of missingSignals) {
    if (paths.some((path) => signal.patterns.some((pattern) => pattern.test(path)))) continue;
    findings.push(createFinding({
      title: signal.title,
      description: signal.description,
      severity: signal.severity,
      category: signal.category,
      evidence: [signal.evidence],
      recommendation: signal.recommendation,
      sourceAnalyzer: 'repository-health',
      ruleId: signal.ruleId,
      confidence: signal.confidence,
      tags: ['github-quality']
    }));
  }

  for (const path of paths.filter((item) => item === '.env' || item.endsWith('/.env'))) {
    findings.push(createFinding({
      title: 'Environment file is committed',
      description: 'A .env file appears in the project files and may contain local secrets or machine-specific configuration.',
      severity: 'high',
      category: 'security',
      filePath: path,
      evidence: [`Found ${path}.`],
      recommendation: 'Remove .env from source control, rotate any exposed credentials, and commit only .env.example.',
      sourceAnalyzer: 'repository-health',
      ruleId: 'repo/env-file-committed',
      confidence: 0.9,
      tags: ['github-quality', 'secret'],
      fixComplexity: 'medium'
    }));
  }

  for (const path of paths.filter((item) => item === '.DS_Store' || item.endsWith('/.DS_Store'))) {
    findings.push(createFinding({
      title: 'macOS metadata file is committed',
      description: '.DS_Store is local OS metadata and should not be part of project source.',
      severity: 'low',
      category: 'config',
      filePath: path,
      evidence: [`Found ${path}.`],
      recommendation: 'Remove .DS_Store files and add them to .gitignore.',
      sourceAnalyzer: 'repository-health',
      ruleId: 'repo/ds-store-committed',
      confidence: 0.95,
      tags: ['github-quality', 'gitignore']
    }));
  }

  for (const dir of project.ignoredDirectories.filter((item) => item === 'vendor/node_modules' || item.endsWith('/vendor/node_modules'))) {
    findings.push(createFinding({
      title: 'Dependency directory is present in the source package',
      description: 'node_modules is a generated dependency directory and makes source packages noisy, large, and harder to review.',
      severity: 'medium',
      category: 'maintainability',
      filePath: dir,
      evidence: [`Found ignored dependency directory ${dir}.`],
      recommendation: 'Do not commit or distribute node_modules; rely on package.json plus lockfile for reproducible installs.',
      sourceAnalyzer: 'repository-health',
      ruleId: 'repo/node-modules-present',
      confidence: 0.86,
      tags: ['github-quality', 'dependency']
    }));
  }

  return { analyzerId: 'repository-health', findings };
}

export function secretAnalyzer(project: BrowserProject): AnalyzerResult {
  const patterns = [
    { ruleId: 'secret/private-key', pattern: /-----BEGIN (RSA |EC |OPENSSH |)?PRIVATE KEY-----/, severity: 'critical' as const },
    { ruleId: 'secret/openai-like-key', pattern: /\bsk[-_][A-Za-z0-9_-]{16,}\b/, severity: 'high' as const },
    { ruleId: 'secret/tencent-cloud-key', pattern: /\bAKID[A-Za-z0-9]{16,}\b/, severity: 'high' as const },
    { ruleId: 'secret/mongodb-uri-credentials', pattern: /mongodb(?:\+srv)?:\/\/[^:\s/]+:[^@\s/]+@/i, severity: 'high' as const },
    { ruleId: 'secret/api-key', pattern: /\b(?:api[_-]?key|secret(?:Id|Key)?|token|password)\b\s*[:=]\s*["'][^"']{12,}["']/i, severity: 'high' as const }
  ];
  const findings: Finding[] = [];
  for (const file of project.files.filter((item) => isProductionSourcePath(item.path))) {
    for (const pattern of patterns) {
      const match = file.content.match(pattern.pattern);
      if (match?.index === undefined) {
        continue;
      }
      const info = lineInfo(file.content, match.index);
      findings.push(createFinding({
        title: 'Possible secret committed',
        description: 'A value matching a secret or credential pattern appears in source-controlled files.',
        severity: pattern.severity,
        category: 'security',
        filePath: file.path,
        startLine: info.line,
        endLine: info.line,
        codeSnippet: info.snippet.replace(/(["'=:\s])[^"'=\s]{8,}/g, '$1[redacted]'),
        evidence: [`Matched ${pattern.ruleId}.`],
        recommendation: 'Remove the secret from source, rotate the credential, and load it through environment variables.',
        sourceAnalyzer: 'secret',
        ruleId: pattern.ruleId,
        confidence: 0.82,
        fixComplexity: 'medium'
      }));
    }
  }
  return { analyzerId: 'secret', findings };
}


export function testAnalyzer(project: BrowserProject): AnalyzerResult {
  const hasTestSignal = project.files.some((file) => /(\.test\.|\.spec\.|^tests\/|^test\/)/.test(file.path));
  const packageFile = project.byPath['package.json'];
  const hasTestScript = packageFile?.content.includes('"test"') ?? false;
  if (hasTestSignal || hasTestScript) {
    return { analyzerId: 'test', findings: [] };
  }
  return {
    analyzerId: 'test',
    findings: [createFinding({
      title: 'No test signal found',
      description: 'The project has no obvious tests or test script.',
      severity: 'medium',
      category: 'test',
      evidence: ['No test/spec files or package.json test script found.'],
      recommendation: 'Add a minimal automated test suite and document how to run it.',
      sourceAnalyzer: 'test',
      ruleId: 'test/no-test-signal',
      confidence: 0.76
    })]
  };
}

export function aiSmellAnalyzer(project: BrowserProject): AnalyzerResult {
  const findings: Finding[] = [];
  const smellRules = [
    { ruleId: 'ai-smell/placeholder', pattern: /(?:throw\s+new\s+(?:Error|UnsupportedOperationException)\s*\([^)]*\b(?:not implemented|todo)\b|raise\s+NotImplementedError\b|return\s+['"`](?:coming soon|not implemented|todo)\b|>\s*(?:lorem ipsum|coming soon)\b)/i, severity: 'medium' as const },
    { ruleId: 'ai-smell/hardcoded-localhost', pattern: /https?:\/\/localhost:\d+/i, severity: 'medium' as const },
    { ruleId: 'ai-smell/mock-data', pattern: /\b(?:const|let|var)\s+(?:mockData|fakeData|dummyData)\b|\b(?:mockData|fakeData|dummyData)\s*[:=]/, severity: 'medium' as const }
  ];

  for (const file of project.files.filter((item) => isProductionSourcePath(item.path))) {
    const emptyCatch = file.content.match(/catch\s*\([^)]*\)\s*\{\s*\}/m);
    if (emptyCatch?.index !== undefined) {
      const info = lineInfo(file.content, emptyCatch.index);
      findings.push(createFinding({
        title: 'Empty catch block',
        description: 'An exception is caught and ignored.',
        severity: 'high',
        category: 'bug',
        filePath: file.path,
        startLine: info.line,
        endLine: info.line,
        codeSnippet: info.snippet,
        evidence: ['Found catch block with no handling logic.'],
        recommendation: 'Log, surface, or recover from the error; avoid silently swallowing exceptions.',
        sourceAnalyzer: 'ai-coding-smell',
        ruleId: 'ai-smell/empty-catch',
        confidence: 0.88
      }));
    }
    for (const rule of smellRules) {
      const match = file.content.match(rule.pattern);
      if (match?.index === undefined) {
        continue;
      }
      const info = lineInfo(file.content, match.index);
      findings.push(createFinding({
        title: 'AI coding smell',
        description: 'The code contains a pattern frequently seen in unfinished AI-generated projects.',
        severity: rule.severity,
        category: 'ai-smell',
        filePath: file.path,
        startLine: info.line,
        endLine: info.line,
        codeSnippet: info.snippet,
        evidence: [`Matched ${rule.ruleId}.`],
        recommendation: 'Replace placeholder or local-only behavior with real configuration and implementation logic.',
        sourceAnalyzer: 'ai-coding-smell',
        ruleId: rule.ruleId,
        confidence: 0.72
      }));
    }
  }
  return { analyzerId: 'ai-coding-smell', findings };
}
