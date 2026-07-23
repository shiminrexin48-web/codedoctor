import type { ProjectContext, ProjectMaturityReport } from '@codedoctor/shared';

type MaturityCheck = ProjectMaturityReport['checks'][number];
type MaturityDefinition = Omit<MaturityCheck, 'passed'> & { patterns: RegExp[] };

const maturityDefinitions: MaturityDefinition[] = [
  {
    id: 'readme', label: 'README', patterns: [/^readme(\.md)?$/i], weight: 12,
    evidence: 'Root README explains project purpose and usage.',
    recommendation: 'Add a root README with setup, run, test, and troubleshooting sections.'
  },
  {
    id: 'license', label: 'License', patterns: [/^license(\.md|\.txt)?$/i], weight: 8,
    evidence: 'Root license clarifies reuse boundaries.',
    recommendation: 'Add a LICENSE file if the project will be shared or reused.'
  },
  {
    id: 'ci', label: 'CI', patterns: [/^\.github\/workflows\/.+\.ya?ml$/i], weight: 14,
    evidence: 'CI runs automated verification.',
    recommendation: 'Add a workflow that installs dependencies and runs tests/builds.'
  },
  {
    id: 'tests', label: 'Tests', patterns: [/(\.test\.|\.spec\.|^tests?\/)/i], weight: 14,
    evidence: 'Automated tests are visible in the repository.',
    recommendation: 'Add meaningful tests for scanner, analyzer, UI, and CLI behavior.'
  },
  {
    id: 'lockfile', label: 'Reproducible dependencies', patterns: [/(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|poetry\.lock|uv\.lock|Pipfile\.lock)$/], weight: 12,
    evidence: 'Dependency lockfile is present.', recommendation: 'Commit a lockfile for the package manager used by the project.'
  },
  {
    id: 'security', label: 'Security policy', patterns: [/^(security\.md|\.github\/SECURITY\.md)$/i], weight: 10,
    evidence: 'Security reporting path is documented.', recommendation: 'Add SECURITY.md with reporting instructions and support policy.'
  },
  {
    id: 'contributing', label: 'Contribution guide', patterns: [/^(contributing\.md|\.github\/CONTRIBUTING\.md)$/i], weight: 8,
    evidence: 'Contribution expectations are documented.', recommendation: 'Add CONTRIBUTING.md with setup, test, branch, and PR expectations.'
  },
  {
    id: 'code-of-conduct', label: 'Code of conduct', patterns: [/^(?:\.github\/|docs\/)?code_of_conduct\.md$/i], weight: 4,
    evidence: 'Community behavior and enforcement expectations are documented.',
    recommendation: 'Add CODE_OF_CONDUCT.md with expected behavior and a private enforcement path.'
  },
  {
    id: 'issue-template', label: 'Issue templates', patterns: [/^\.github\/ISSUE_TEMPLATE\/.+\.(?:md|ya?ml)$/i], weight: 4,
    evidence: 'Issue intake requests structured reproduction and context.',
    recommendation: 'Add structured bug and feature issue forms under .github/ISSUE_TEMPLATE/.'
  },
  {
    id: 'pr-template', label: 'Pull request template', patterns: [/^(?:\.github\/|docs\/)?pull_request_template\.md$/i], weight: 4,
    evidence: 'Pull requests have a consistent verification and risk checklist.',
    recommendation: 'Add a pull request template with purpose, verification, compatibility, and risk sections.'
  },
  {
    id: 'changelog', label: 'Changelog', patterns: [/^(changelog|changes|history)\.md$/i], weight: 4,
    evidence: 'Important user-visible changes are tracked between releases.',
    recommendation: 'Add CHANGELOG.md with an Unreleased section and versioned entries.'
  },
  {
    id: 'dependency-automation', label: 'Dependency automation',
    patterns: [/^\.github\/dependabot\.ya?ml$/i, /^(renovate\.json|\.renovaterc(?:\.json)?)$/i], weight: 4,
    evidence: 'Dependency updates are checked on a predictable schedule.',
    recommendation: 'Configure Dependabot or Renovate with grouping and rate limits.'
  },
  {
    id: 'env-example', label: 'Environment example', patterns: [/^\.env\.example$/], weight: 8,
    evidence: 'Environment variables are documented safely.', recommendation: 'Add .env.example with variable names and safe sample values.'
  },
  {
    id: 'ignore', label: 'Ignore policy', patterns: [/^(\.gitignore|\.codedoctorignore)$/], weight: 8,
    evidence: 'Ignore rules reduce generated-file and local-secret noise.',
    recommendation: 'Add .gitignore and .codedoctorignore for generated files, local reports, and secrets.'
  },
  {
    id: 'entrypoint', label: 'Runnable entry', patterns: [/(^|\/)(package\.json|pyproject\.toml|pom\.xml|build\.gradle|CMakeLists\.txt)$/], weight: 6,
    evidence: 'A standard build or runtime manifest is present.', recommendation: 'Add a standard manifest or document the runnable entry point.'
  }
];

export function assessProjectMaturity(context: ProjectContext): ProjectMaturityReport {
  const paths = context.files.files.map((file) => file.path);
  const checks = maturityDefinitions.map(({ patterns, ...definition }) => ({
    ...definition,
    passed: paths.some((path) => patterns.some((pattern) => pattern.test(path)))
  }));
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.filter((check) => check.passed).reduce((sum, check) => sum + check.weight, 0);
  return { score: Math.round((earned / total) * 100), checks };
}
