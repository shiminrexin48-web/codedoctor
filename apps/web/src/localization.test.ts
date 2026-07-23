import { describe, expect, it } from 'vitest';
import type { CodeDoctorReport, Finding } from '@codedoctor/shared';
import { localizeFinding, localizeMarkdownReport } from './localization.js';

const finding: Finding = {
  id: 'f1',
  title: 'Package script target is missing',
  description: 'A package.json script points to a file that does not exist.',
  severity: 'high',
  category: 'build',
  filePath: 'package.json',
  evidence: ['scripts.start runs "node server.js", but server.js was not found.'],
  recommendation: 'Create the referenced entry file or update the script to match the real entry point.',
  sourceAnalyzer: 'node-dependency',
  ruleId: 'node/script-target-missing',
  confidence: 0.95,
  tags: [],
  applicableProjectTypes: ['node-web'],
  fixComplexity: 'easy',
  aiExplainable: true
};

const report: CodeDoctorReport = {
  version: '0.1.0',
  generatedAt: '2026-07-10T00:00:00.000Z',
  context: {
    rootPath: '/tmp/project',
    detectedTypes: ['node-web', 'generic'],
    languages: ['typescript'],
    frameworks: ['vite'],
    packageManagers: ['npm'],
    confidence: 0.89,
    evidence: [],
    recommendedAnalyzers: [],
    unsupportedAreas: [],
    files: { files: [], byPath: {} }
  },
  analyzerResults: [],
  findings: [finding],
  score: {
    overallScore: 85,
    scores: {
      projectHygiene: { score: 91, confidence: 'medium', findingCount: 1, explanation: '' },
      security: { score: 100, confidence: 'high', findingCount: 0, explanation: '' },
      maintainability: { score: 90, confidence: 'medium', findingCount: 0, explanation: '' },
      test: { score: 76, confidence: 'medium', findingCount: 1, explanation: '' },
      dependency: { score: 88, confidence: 'high', findingCount: 1, explanation: '' },
      buildAndRun: { score: 72, confidence: 'high', findingCount: 1, explanation: '' },
      aiCodingRisk: { score: 80, confidence: 'medium', findingCount: 1, explanation: '' },
      frameworkSpecific: { score: 84, confidence: 'medium', findingCount: 0, explanation: '' }
    },
    coverage: {
      enabledAnalyzers: ['node-dependency'],
      disabledAnalyzers: ['unity'],
      unsupportedAnalyzers: [],
      confidence: 0.83,
      notes: ['Node/Web coverage is higher because the Node dependency analyzer is available in the MVP.']
    }
  },
  summary: { findingCount: 1, criticalCount: 0, highCount: 1, mediumCount: 0, lowCount: 0, infoCount: 0 }
};

describe('localization', () => {
  it('localizes known finding rules for imported reports', () => {
    const localized = localizeFinding(finding);

    expect(localized.title).toBe('package.json 脚本指向不存在的文件');
    expect(localized.recommendation).toContain('真实存在的入口路径');
  });

  it('renders a Chinese markdown preview for imported reports', () => {
    const markdown = localizeMarkdownReport(report, [{
      ...localizeFinding(finding),
      aiExplanation: {
        provider: 'deepseek',
        model: 'deepseek-v4-pro',
        generatedAt: '2026-07-10T00:00:00.000Z',
        studentExplanation: '脚本入口不存在。',
        riskImpact: '项目无法启动。',
        repairSteps: ['修复脚本'],
        humanChecks: ['确认入口'],
        rawEvidenceScope: ['node/script-target-missing']
      }
    }]);

    expect(markdown).toContain('# CodeDoctor 报告');
    expect(markdown).toContain('## 问题列表');
    expect(markdown).toContain('package.json 脚本指向不存在的文件');
    expect(markdown).toContain('由于 MVP 已支持 Node 依赖分析器');
    expect(markdown).toContain('AI 解释');
    expect(markdown).toContain('脚本入口不存在');
  });
});
