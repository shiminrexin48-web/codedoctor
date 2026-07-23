import type { AnalyzerResult, Finding, FindingCategory, ProjectContext, ProjectProfile, ScoreDimension, ScoreReport } from '@codedoctor/shared';

interface ScoreInput {
  context: ProjectContext;
  findings: Finding[];
  analyzerResults: AnalyzerResult[];
  profile?: ProjectProfile;
}

const severityPenalty = {
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

export const SCORE_WEIGHTS: Record<keyof ScoreReport['scores'], number> = {
  projectHygiene: 15,
  security: 15,
  maintainability: 15,
  test: 15,
  dependency: 10,
  buildAndRun: 15,
  frameworkSpecific: 10,
  aiCodingRisk: 5
};

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function dimensionScore(
  name: keyof ScoreReport['scores'],
  findings: Finding[],
  confidence: ScoreDimension['confidence'],
  runtimeVerified: boolean
): ScoreDimension {
  const categories = dimensionCategories[name];
  const relevant = findings.filter((finding) => categories.includes(finding.category));
  const penalty = relevant.reduce((sum, finding) => {
    return sum + severityPenalty[finding.severity] * Math.max(0.5, Math.min(1, finding.confidence));
  }, 0);

  const score = clamp(100 - penalty);
  const weight = SCORE_WEIGHTS[name];
  const verified = name === 'buildAndRun' ? runtimeVerified : confidence !== 'low';
  return {
    score,
    confidence,
    findingCount: relevant.length,
    weight,
    contribution: Math.round(score * weight) / 100,
    deduction: 100 - score,
    weightedDeduction: Math.round((100 - score) * weight) / 100,
    verified,
    explanation: name === 'buildAndRun' && !runtimeVerified
      ? '仅完成静态构建配置检查，尚未在本地执行真实安装、构建或启动命令。'
      : relevant.length === 0
        ? 'No matching findings were produced for this dimension within the enabled analyzer coverage.'
        : `${relevant.length} finding(s) affected this dimension; penalties are adjusted by severity and analyzer confidence.`
  };
}

function confidenceFor(context: ProjectContext, analyzerResults: AnalyzerResult[], dimension: keyof ScoreReport['scores']): ScoreDimension['confidence'] {
  const enabled = new Set(analyzerResults.filter((result) => !result.skipped).map((result) => result.analyzerId));
  const hasLanguageAnalyzer =
    (context.detectedTypes.includes('node-web') && enabled.has('node-dependency')) ||
    (context.detectedTypes.includes('python') && enabled.has('python-project')) ||
    (context.detectedTypes.includes('java') && enabled.has('java-project')) ||
    (context.detectedTypes.includes('cpp') && enabled.has('cpp-project'));
  if (dimension === 'dependency' || dimension === 'buildAndRun') {
    return hasLanguageAnalyzer ? 'high' : 'low';
  }
  if (dimension === 'frameworkSpecific') {
    return enabled.has('unity') || hasLanguageAnalyzer ? 'medium' : 'low';
  }
  if (dimension === 'security' && enabled.has('secret')) {
    return 'high';
  }
  if (dimension === 'test' && enabled.has('test')) {
    return 'medium';
  }
  return 'medium';
}

export function scoreProject(input: ScoreInput): ScoreReport {
  const enabledAnalyzers = input.analyzerResults.filter((result) => !result.skipped).map((result) => result.analyzerId);
  const disabledAnalyzers = input.analyzerResults.filter((result) => result.skipped).map((result) => result.analyzerId);
  const unsupportedAnalyzers = input.context.unsupportedAreas.map((area) => area.area);
  const runtimeVerified = enabledAnalyzers.includes('runtime-verification');

  const scores = Object.fromEntries(
    (Object.keys(dimensionCategories) as Array<keyof ScoreReport['scores']>).map((dimension) => [
      dimension,
      dimensionScore(dimension, input.findings, confidenceFor(input.context, input.analyzerResults, dimension), runtimeVerified)
    ])
  ) as ScoreReport['scores'];

  const overallScore = input.profile?.eligibility.status === 'ineligible'
    ? 0
    : clamp(Object.values(scores).reduce((sum, dimension) => sum + (dimension.contribution ?? 0), 0));

  const notes = [
    `Detected project types: ${input.context.detectedTypes.join(', ')}.`,
    ['node-web', 'python', 'java', 'cpp'].some((type) => input.context.detectedTypes.includes(type as ProjectContext['detectedTypes'][number]))
      ? 'Stack-aware coverage is enabled for detected Node/Python/Java/C/C++ project evidence.'
      : 'This scan mainly reflects universal project checks for the detected project type.',
    ...input.context.unsupportedAreas.map((area) => `${area.area}: ${area.reason}`)
  ];

  return {
    overallScore,
    maximumScore: 100,
    profile: input.profile,
    eligibility: input.profile?.eligibility,
    scores,
    coverage: {
      enabledAnalyzers,
      disabledAnalyzers,
      unsupportedAnalyzers,
      confidence: clamp((enabledAnalyzers.length / Math.max(1, input.analyzerResults.length)) * 100) / 100,
      notes
    }
  };
}
