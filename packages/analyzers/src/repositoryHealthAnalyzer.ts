import type { Analyzer, Finding } from '@codedoctor/shared';
import { finding } from './utils.js';

function hasFile(files: Record<string, unknown>, patterns: RegExp[]): boolean {
  return Object.keys(files).some((path) => patterns.some((pattern) => pattern.test(path)));
}

interface MissingRepositorySignal {
  patterns: RegExp[];
  title: string;
  description: string;
  severity: Finding['severity'];
  category: Finding['category'];
  evidence: string;
  recommendation: string;
  ruleId: string;
  confidence: number;
  tags: string[];
}

const missingRepositorySignals: MissingRepositorySignal[] = [
  {
    patterns: [/^license(\.md|\.txt)?$/i],
    title: 'License file is missing', description: 'The repository has no root LICENSE file.', severity: 'low', category: 'docs',
    evidence: 'No LICENSE, LICENSE.md, or LICENSE.txt file found at the project root.', recommendation: 'Add a license file when the project is intended to be shared or reused.',
    ruleId: 'repo/license-missing', confidence: 0.82, tags: ['github-quality', 'community-profile']
  },
  {
    patterns: [/^contributing(\.md|\.txt)?$/i, /^(?:\.github|docs)\/CONTRIBUTING\.md$/i],
    title: 'Contribution guide is missing', description: 'The repository does not explain how others should contribute changes.', severity: 'info', category: 'docs',
    evidence: 'No CONTRIBUTING.md found in a GitHub-supported location.', recommendation: 'Add CONTRIBUTING.md with setup, test, branch, rule-quality, and pull request expectations.',
    ruleId: 'repo/contributing-missing', confidence: 0.72, tags: ['github-quality', 'community-profile']
  },
  {
    patterns: [/^security\.md$/i, /^\.github\/SECURITY\.md$/i],
    title: 'Security policy is missing', description: 'The repository has no documented way to report security issues.', severity: 'low', category: 'security',
    evidence: 'No SECURITY.md found at the root or under .github/.', recommendation: 'Add SECURITY.md with supported versions, private reporting instructions, and response expectations.',
    ruleId: 'repo/security-policy-missing', confidence: 0.78, tags: ['github-quality', 'security']
  },
  {
    patterns: [/^(?:\.github\/|docs\/)?code_of_conduct\.md$/i],
    title: 'Code of conduct is missing', description: 'The repository does not define standards for respectful community participation.', severity: 'info', category: 'docs',
    evidence: 'No CODE_OF_CONDUCT.md found in a GitHub-supported location.', recommendation: 'Add a code of conduct with expected behavior, prohibited behavior, and a private enforcement path.',
    ruleId: 'repo/code-of-conduct-missing', confidence: 0.72, tags: ['github-quality', 'community-profile']
  },
  {
    patterns: [/^\.github\/ISSUE_TEMPLATE\/.+\.(?:md|ya?ml)$/i],
    title: 'Issue templates are missing', description: 'Contributors are not guided to provide reproducible, actionable issue reports.', severity: 'info', category: 'docs',
    evidence: 'No issue template or issue form found under .github/ISSUE_TEMPLATE/.', recommendation: 'Add structured bug and feature issue forms that request reproduction, environment, and privacy checks.',
    ruleId: 'repo/issue-template-missing', confidence: 0.76, tags: ['github-quality', 'community-profile']
  },
  {
    patterns: [/^(?:\.github\/|docs\/)?pull_request_template\.md$/i, /^(?:\.github\/|docs\/)?PULL_REQUEST_TEMPLATE\/.+\.md$/i],
    title: 'Pull request template is missing', description: 'Pull requests have no standard place to record scope, validation, and risk.', severity: 'info', category: 'docs',
    evidence: 'No pull request template found in a GitHub-supported location.', recommendation: 'Add a PR template covering purpose, implementation, verification, secrets, compatibility, and remaining risk.',
    ruleId: 'repo/pr-template-missing', confidence: 0.76, tags: ['github-quality', 'review']
  },
  {
    patterns: [/^changelog\.md$/i, /^changes\.md$/i, /^history\.md$/i],
    title: 'Changelog is missing', description: 'Users cannot quickly determine important behavior and compatibility changes between versions.', severity: 'info', category: 'docs',
    evidence: 'No root CHANGELOG.md, CHANGES.md, or HISTORY.md found.', recommendation: 'Maintain an Unreleased section and record important user-visible changes for each release.',
    ruleId: 'repo/changelog-missing', confidence: 0.68, tags: ['github-quality', 'release']
  },
  {
    patterns: [/^\.github\/dependabot\.ya?ml$/i, /^renovate\.json$/i, /^\.renovaterc(?:\.json)?$/i],
    title: 'Automated dependency updates are not configured', description: 'Dependency and workflow updates rely entirely on manual maintenance.', severity: 'info', category: 'dependency',
    evidence: 'No Dependabot or Renovate configuration found.', recommendation: 'Configure grouped, rate-limited dependency and GitHub Actions updates on a predictable schedule.',
    ruleId: 'repo/dependency-updates-missing', confidence: 0.74, tags: ['github-quality', 'supply-chain']
  },
  {
    patterns: [/^\.github\/workflows\/.+\.ya?ml$/i, /(^|\/)(circleci|travis|gitlab-ci|azure-pipelines)/i],
    title: 'CI workflow is missing', description: 'No obvious continuous integration workflow was found.', severity: 'medium', category: 'test',
    evidence: 'No .github/workflows/*.yml or common CI config found.', recommendation: 'Add CI that installs frozen dependencies and runs tests/builds on pull requests with minimal permissions.',
    ruleId: 'repo/ci-missing', confidence: 0.8, tags: ['github-quality', 'ci']
  }
];

export const repositoryHealthAnalyzer: Analyzer = {
  id: 'repository-health',
  name: 'Repository Health Analyzer',
  capability: {
    languages: ['any'],
    frameworks: ['any'],
    projectTypes: ['any'],
    filePatterns: ['README*', 'LICENSE*', '.github/**', '.env', '.DS_Store', 'node_modules/'],
    categories: ['docs', 'config', 'security', 'maintainability', 'test'],
    confidence: 'medium',
    requiresExternalTool: false,
    requiresNetwork: false,
    requiresAI: false,
    optional: false
  },
  canRun: () => true,
  async analyze(context) {
    const findings: Finding[] = [];
    const byPath = context.files.byPath;
    const paths = Object.keys(byPath);
    const ignored = context.files.ignoredDirectories ?? [];

    for (const signal of missingRepositorySignals) {
      if (hasFile(byPath, signal.patterns)) continue;
      findings.push(finding({
        title: signal.title,
        description: signal.description,
        severity: signal.severity,
        category: signal.category,
        evidence: [signal.evidence],
        recommendation: signal.recommendation,
        sourceAnalyzer: 'repository-health',
        ruleId: signal.ruleId,
        confidence: signal.confidence,
        tags: signal.tags
      }));
    }

    for (const path of paths.filter((item) => item === '.env' || item.endsWith('/.env'))) {
      findings.push(finding({
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
      findings.push(finding({
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

    for (const dir of ignored.filter((item) => item === 'vendor/node_modules' || item.endsWith('/vendor/node_modules'))) {
      findings.push(finding({
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
        tags: ['github-quality', 'dependency'],
        fixComplexity: 'easy'
      }));
    }

    return { analyzerId: 'repository-health', findings };
  }
};
