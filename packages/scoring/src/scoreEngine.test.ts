import { describe, expect, it } from 'vitest';
import type { Finding, ProjectContext, ProjectProfile } from '@codedoctor/shared';
import { scoreProject } from './index.js';

const context: ProjectContext = {
  rootPath: '/tmp/project',
  detectedTypes: ['generic', 'node-web'],
  languages: ['typescript'],
  frameworks: ['vite'],
  packageManagers: ['pnpm'],
  confidence: 0.9,
  evidence: [],
  recommendedAnalyzers: ['universal', 'secret', 'node-dependency'],
  unsupportedAreas: [],
  files: { files: [], byPath: {} }
};

function finding(partial: Partial<Finding>): Finding {
  return {
    id: partial.id ?? 'f1',
    title: partial.title ?? 'Finding',
    description: partial.description ?? 'Description',
    severity: partial.severity ?? 'high',
    category: partial.category ?? 'security',
    evidence: [],
    recommendation: 'Fix it',
    sourceAnalyzer: partial.sourceAnalyzer ?? 'secret',
    ruleId: partial.ruleId ?? 'rule',
    confidence: partial.confidence ?? 0.9,
    tags: [],
    applicableProjectTypes: ['generic'],
    fixComplexity: 'easy',
    aiExplainable: true
  };
}

describe('scoreProject', () => {
  it('penalizes dimensions by severity and explains coverage', () => {
    const score = scoreProject({
      context,
      findings: [
        finding({ severity: 'high', category: 'security' }),
        finding({ severity: 'medium', category: 'test', sourceAnalyzer: 'test' })
      ],
      analyzerResults: [
        { analyzerId: 'secret', findings: [] },
        { analyzerId: 'node-dependency', findings: [] },
        { analyzerId: 'test', findings: [] },
        { analyzerId: 'unity', findings: [], skipped: true, skipReason: 'not unity' }
      ]
    });

    expect(score.overallScore).toBeLessThan(100);
    expect(score.scores.security.score).toBeLessThan(score.scores.projectHygiene.score);
    expect(score.coverage.enabledAnalyzers).toContain('secret');
    expect(score.coverage.disabledAnalyzers).toContain('unity');
    expect(score.coverage.notes.join(' ')).toContain('Stack-aware coverage');
  });

  it('uses fixed weights and exposes exact score contributions', () => {
    const profile: ProjectProfile = {
      primaryPurpose: 'cli', displayName: 'TypeScript CLI 命令行工具', confidence: 0.9,
      candidates: ['cli'], evidence: ['src/cli.ts'], eligibility: { status: 'eligible', reasons: ['supported'] }
    };
    const score = scoreProject({
      context,
      profile,
      findings: [finding({ severity: 'high', category: 'security', confidence: 1 })],
      analyzerResults: [{ analyzerId: 'secret', findings: [] }, { analyzerId: 'node-dependency', findings: [] }]
    });

    expect(score.scores.security.weight).toBe(15);
    expect(score.scores.dependency.weight).toBe(10);
    expect(score.scores.aiCodingRisk.weight).toBe(5);
    expect(score.scores.security.deduction).toBe(15);
    expect(score.scores.security.weightedDeduction).toBe(2.25);
    expect(score.scores.security.contribution).toBe(12.75);
    expect(score.overallScore).toBe(98);
    expect(score.profile?.primaryPurpose).toBe('cli');
    expect(score.eligibility?.status).toBe('eligible');
  });

  it('marks build and run as unverified without a runtime verification analyzer', () => {
    const score = scoreProject({ context, findings: [], analyzerResults: [{ analyzerId: 'node-dependency', findings: [] }] });
    expect(score.scores.buildAndRun.verified).toBe(false);
    expect(score.scores.buildAndRun.explanation).toContain('静态');
  });
});
