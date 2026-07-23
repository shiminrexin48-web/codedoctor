import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CodeDoctorReport, Finding } from '@codedoctor/shared';

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function createCodeDoctorReport(input: CodeDoctorReport): CodeDoctorReport {
  return { ...input, markdown: renderMarkdownReport(input) };
}

function renderFinding(finding: Finding, index: number): string {
  const trust = finding.trust ? [
    `- Why matched: ${finding.trust.whyMatched}`,
    `- False-positive risk: ${finding.trust.falsePositiveRisk}`,
    `- Scope: ${finding.trust.scope}`
  ].join('\n') : '';
  const ai = finding.aiExplanation ? [
    '', '**AI explanation**', '',
    `- Student explanation: ${finding.aiExplanation.studentExplanation}`,
    `- Risk impact: ${finding.aiExplanation.riskImpact}`,
    `- Repair steps: ${finding.aiExplanation.repairSteps.join('; ')}`,
    `- Human checks: ${finding.aiExplanation.humanChecks.join('; ')}`
  ].join('\n') : '';
  return [
    `### ${index + 1}. ${finding.title}`, '',
    `- Severity: ${finding.severity}`,
    `- Category: ${finding.category}`,
    `- Analyzer: ${finding.sourceAnalyzer}`,
    `- Rule: ${finding.ruleId}`,
    finding.filePath ? `- File: ${finding.filePath}${finding.startLine ? `:${finding.startLine}` : ''}` : '- File: project-level',
    `- Evidence: ${finding.evidence.join('; ')}`,
    `- Recommendation: ${finding.recommendation}`,
    trust,
    ai
  ].join('\n');
}

function renderIdentification(report: CodeDoctorReport): string {
  return [
    '## Project Identification', '',
    `- Root: ${report.context.rootPath}`,
    `- Detected types: ${report.context.detectedTypes.join(', ')}`,
    `- Languages: ${report.context.languages.join(', ')}`,
    `- Frameworks: ${report.context.frameworks.join(', ')}`,
    `- Package managers: ${report.context.packageManagers.join(', ')}`,
    `- Detection confidence: ${Math.round(report.context.confidence * 100)}%`,
    report.score.profile ? `- Primary purpose: ${report.score.profile.displayName}` : '',
    report.score.profile ? `- Purpose confidence: ${Math.round(report.score.profile.confidence * 100)}%` : '',
    report.score.eligibility ? `- Score eligibility: ${report.score.eligibility.status} (${report.score.eligibility.reasons.join('; ')})` : ''
  ].join('\n');
}

function renderScope(report: CodeDoctorReport): string {
  const scope = report.context.files.scope;
  if (!scope) return '';
  return [
    '## Scan Scope', '',
    `- Files in scope: ${scope.totalFiles}`,
    `- Scanned files: ${scope.scannedFiles}`,
    `- Production files: ${scope.productionFiles}`,
    `- Test files: ${scope.testFiles}`,
    `- Fixture files: ${scope.fixtureFiles}`,
    `- Generated files: ${scope.generatedFiles}`,
    `- Documentation files: ${scope.documentationFiles}`,
    `- Configuration files: ${scope.configurationFiles}`,
    `- Ignored directories: ${scope.ignoredDirectories.join(', ') || 'none'}`
  ].join('\n');
}

function renderMaturity(report: CodeDoctorReport): string {
  if (!report.maturity) return '';
  const rows = report.maturity.checks
    .map((check) => `| ${check.label} | ${check.passed ? 'yes' : 'no'} | ${check.weight} | ${check.passed ? check.evidence : check.recommendation} |`)
    .join('\n');
  return [
    '## Project Maturity', '',
    `Maturity score: ${report.maturity.score}`, '',
    '| Check | Passed | Weight | Evidence or next step |',
    '| --- | --- | ---: | --- |',
    rows
  ].join('\n');
}

function renderAi(report: CodeDoctorReport): string {
  if (!report.ai) return '';
  return [
    '## AI Explanation', '',
    `- Provider: ${report.ai.provider}`,
    `- Model: ${report.ai.model}`,
    `- Requested: ${report.ai.requested}`,
    `- Explained findings: ${report.ai.explainedFindings}/${report.ai.limit}`,
    report.ai.skippedReason ? `- Skipped reason: ${report.ai.skippedReason}` : ''
  ].join('\n');
}

function renderCoverageAndScores(report: CodeDoctorReport): string {
  const scoreRows = Object.entries(report.score.scores)
    .map(([name, dimension]) => `| ${name} | ${dimension.score} | ${dimension.weight ?? '-'}${dimension.weight ? '%' : ''} | ${(dimension.contribution ?? dimension.score / 8).toFixed(2)} | ${dimension.confidence} | ${dimension.verified === false ? 'no' : 'yes'} | ${dimension.findingCount} |`)
    .join('\n');
  return [
    '## Analyzer Coverage', '',
    `- Enabled: ${report.score.coverage.enabledAnalyzers.join(', ') || 'none'}`,
    `- Disabled: ${report.score.coverage.disabledAnalyzers.join(', ') || 'none'}`,
    `- Unsupported areas: ${report.score.coverage.unsupportedAnalyzers.join(', ') || 'none'}`, '',
    report.score.coverage.notes.map((note) => `- ${note}`).join('\n'), '',
    '## Scores', '',
    `Overall score: ${report.score.eligibility?.status === 'ineligible' ? 'not rated' : report.score.overallScore}`, '',
    '| Dimension | Score | Weight | Contribution | Confidence | Verified | Findings |',
    '| --- | ---: | ---: | ---: | --- | --- | ---: |',
    scoreRows
  ].join('\n');
}

function renderConclusion(report: CodeDoctorReport): string {
  const unrated = report.score.eligibility?.status === 'ineligible';
  const strengths = Object.entries(report.score.scores)
    .filter(([, dimension]) => dimension.score >= 90 && dimension.confidence !== 'low' && dimension.verified !== false)
    .slice(0, 4)
    .map(([name, dimension]) => `- ${name}: ${dimension.score}/100 with ${dimension.confidence} confidence.`)
    .join('\n') || '- Current coverage is not strong enough to confirm a clear strength.';
  const defects = [...report.findings]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 5)
    .map((finding) => `- [${finding.severity}] ${finding.title}: ${finding.recommendation}`)
    .join('\n') || '- No explicit defect was produced by the enabled static rules.';
  const unavailable = '- Not generated because this project is outside the reliable scoring scope.';
  return [
    '## Project Conclusion', '',
    '### Strengths', '', unrated ? unavailable : strengths, '',
    '### Main defects', '', unrated ? unavailable : defects
  ].join('\n');
}

function renderFindingSummary(report: CodeDoctorReport): string {
  return [
    '## Finding Summary', '',
    `- Total: ${report.summary.findingCount}`,
    `- Critical: ${report.summary.criticalCount}`,
    `- High: ${report.summary.highCount}`,
    `- Medium: ${report.summary.mediumCount}`,
    `- Low: ${report.summary.lowCount}`,
    `- Info: ${report.summary.infoCount}`, '',
    '## Findings', '',
    report.findings.length === 0
      ? 'No findings were produced by the enabled analyzers.'
      : report.findings.map(renderFinding).join('\n\n')
  ].join('\n');
}

export function renderMarkdownReport(report: CodeDoctorReport): string {
  return [
    '# CodeDoctor Report', '',
    `Generated at: ${report.generatedAt}`, '',
    renderIdentification(report),
    renderScope(report),
    renderMaturity(report),
    renderAi(report),
    renderCoverageAndScores(report),
    renderConclusion(report),
    renderFindingSummary(report),
    '## Report Limitations', '',
    'Static analysis did not execute real business workflows, external services, installation, tests, builds, or startup commands. Dependency security does not include a complete vulnerability database.'
  ].filter(Boolean).join('\n\n');
}

export async function writeReports(rootPath: string, report: CodeDoctorReport): Promise<{ jsonPath: string; markdownPath: string }> {
  const outputDir = join(rootPath, '.codedoctor');
  await mkdir(outputDir, { recursive: true });
  const finalReport = createCodeDoctorReport(report);
  const jsonPath = join(outputDir, 'report.json');
  const markdownPath = join(outputDir, 'report.md');
  await writeFile(jsonPath, JSON.stringify(finalReport, null, 2));
  await writeFile(markdownPath, finalReport.markdown ?? renderMarkdownReport(finalReport));
  return { jsonPath, markdownPath };
}
