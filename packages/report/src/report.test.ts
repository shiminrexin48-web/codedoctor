import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CodeDoctorReport } from '@codedoctor/shared';
import { createCodeDoctorReport, renderMarkdownReport, writeReports } from './index.js';

const baseReport: CodeDoctorReport = {
  version: '0.1.0',
  generatedAt: '2026-07-10T00:00:00.000Z',
  context: {
    rootPath: '/tmp/project',
    detectedTypes: ['generic'],
    languages: ['unknown'],
    frameworks: ['unknown'],
    packageManagers: ['unknown'],
    confidence: 0.5,
    evidence: [],
    recommendedAnalyzers: ['universal'],
    unsupportedAreas: [],
    files: { files: [], byPath: {} }
  },
  analyzerResults: [{ analyzerId: 'universal', findings: [] }],
  findings: [],
  score: {
    overallScore: 100,
    scores: {
      projectHygiene: { score: 100, confidence: 'medium', findingCount: 0, explanation: 'ok' },
      security: { score: 100, confidence: 'medium', findingCount: 0, explanation: 'ok' },
      maintainability: { score: 100, confidence: 'medium', findingCount: 0, explanation: 'ok' },
      test: { score: 100, confidence: 'medium', findingCount: 0, explanation: 'ok' },
      dependency: { score: 100, confidence: 'low', findingCount: 0, explanation: 'ok' },
      buildAndRun: { score: 100, confidence: 'low', findingCount: 0, explanation: 'ok' },
      aiCodingRisk: { score: 100, confidence: 'medium', findingCount: 0, explanation: 'ok' },
      frameworkSpecific: { score: 100, confidence: 'low', findingCount: 0, explanation: 'ok' }
    },
    coverage: { enabledAnalyzers: ['universal'], disabledAnalyzers: [], unsupportedAnalyzers: [], confidence: 1, notes: ['Generic coverage only.'] }
  },
  summary: { findingCount: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 }
};

describe('reports', () => {
  it('renders markdown with coverage limitations', () => {
    const markdown = renderMarkdownReport(baseReport);

    expect(markdown).toContain('# CodeDoctor Report');
    expect(markdown).toContain('Analyzer Coverage');
    expect(markdown).toContain('Generic coverage only.');
  });

  it('writes report.json and report.md', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codedoctor-report-'));
    const report = createCodeDoctorReport(baseReport);

    await writeReports(root, report);

    expect(await readFile(join(root, '.codedoctor/report.json'), 'utf8')).toContain('"version"');
    expect(await readFile(join(root, '.codedoctor/report.md'), 'utf8')).toContain('# CodeDoctor Report');
  });

  it('renders project purpose, eligibility, weights, and score contribution', () => {
    const report: CodeDoctorReport = {
      ...baseReport,
      score: {
        ...baseReport.score,
        profile: { primaryPurpose: 'cli', displayName: 'TypeScript CLI 命令行工具', confidence: 0.9, candidates: ['cli'], evidence: ['src/cli.ts'], eligibility: { status: 'eligible', reasons: ['supported'] } },
        eligibility: { status: 'eligible', reasons: ['supported'] },
        scores: { ...baseReport.score.scores, projectHygiene: { ...baseReport.score.scores.projectHygiene, weight: 15, contribution: 15, deduction: 0, weightedDeduction: 0, verified: true } }
      }
    };
    const markdown = renderMarkdownReport(report);
    expect(markdown).toContain('TypeScript CLI 命令行工具');
    expect(markdown).toContain('| projectHygiene | 100 | 15% | 15.00 |');
    expect(markdown).toContain('Static analysis did not execute real business workflows');
  });
});
