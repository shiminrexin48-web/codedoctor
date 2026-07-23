import { describe, expect, it } from 'vitest';
import type { Finding, ProjectContext } from './index.js';

describe('shared types', () => {
  it('models a project context and normalized finding', () => {
    const context: ProjectContext = {
      rootPath: '/tmp/project',
      detectedTypes: ['node-web'],
      languages: ['typescript'],
      frameworks: ['vite'],
      packageManagers: ['pnpm'],
      confidence: 0.9,
      evidence: [],
      recommendedAnalyzers: ['universal'],
      unsupportedAreas: [],
      files: { files: [], byPath: {} }
    };

    const finding: Finding = {
      id: 'f1',
      title: 'Missing README',
      description: 'No README was found.',
      severity: 'low',
      category: 'docs',
      evidence: ['README.md not present'],
      recommendation: 'Add a README with setup instructions.',
      sourceAnalyzer: 'universal',
      ruleId: 'universal/readme-missing',
      confidence: 0.9,
      tags: ['readme'],
      applicableProjectTypes: ['generic', 'node-web'],
      fixComplexity: 'easy',
      aiExplainable: true
    };

    expect(context.detectedTypes).toContain('node-web');
    expect(finding.category).toBe('docs');
  });
});
