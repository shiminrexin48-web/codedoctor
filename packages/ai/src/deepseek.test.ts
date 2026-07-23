import { describe, expect, it, vi } from 'vitest';
import type { Finding, ProjectContext } from '@codedoctor/shared';
import { DeepSeekAIExplainer, explainFindings } from './index.js';

const finding: Finding = {
  id: 'f1',
  title: 'Package script target is missing',
  description: 'A package.json script points to a file that does not exist.',
  severity: 'high',
  category: 'build',
  filePath: 'package.json',
  evidence: ['scripts.start runs "node server.js", but server.js was not found.'],
  recommendation: 'Create the referenced entry file or update the script.',
  sourceAnalyzer: 'node-dependency',
  ruleId: 'node/script-target-missing',
  confidence: 0.95,
  tags: [],
  applicableProjectTypes: ['node-web'],
  fixComplexity: 'easy',
  aiExplainable: true
};

const context: ProjectContext = {
  rootPath: '/tmp/project',
  detectedTypes: ['node-web', 'generic'],
  languages: ['typescript'],
  frameworks: ['vite'],
  packageManagers: ['npm'],
  confidence: 0.9,
  evidence: [],
  recommendedAnalyzers: [],
  unsupportedAreas: [],
  files: { files: [], byPath: {} }
};

describe('DeepSeekAIExplainer', () => {
  it('requests a JSON explanation with thinking disabled', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            studentExplanation: '这个脚本入口不存在。',
            riskImpact: '项目可能无法启动。',
            repairSteps: ['修正 package.json 脚本。'],
            humanChecks: ['确认真实入口文件名。']
          })
        }
      }]
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const explainer = new DeepSeekAIExplainer({ apiKey: 'test-api-key', model: 'deepseek-v4-pro' });
    const result = await explainer.explain({
      finding,
      projectContext: {
        detectedTypes: context.detectedTypes,
        languages: context.languages,
        frameworks: context.frameworks
      },
      analyzerEvidence: finding.evidence
    });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.deepseek.com/chat/completions');
    expect(request.model).toBe('deepseek-v4-pro');
    expect(request.response_format).toEqual({ type: 'json_object' });
    expect(request.thinking).toEqual({ type: 'disabled' });
    expect(result.studentExplanation).toContain('入口不存在');

    vi.unstubAllGlobals();
  });

  it('attaches AI explanations to high priority findings within the limit', async () => {
    const explainer = {
      id: 'deepseek',
      model: 'deepseek-v4-pro',
      explain: vi.fn(async () => ({
        studentExplanation: '解释',
        riskImpact: '影响',
        repairSteps: ['步骤'],
        humanChecks: ['确认']
      }))
    };

    const result = await explainFindings([finding], context, explainer, { limit: 1 });

    expect(result.explainedCount).toBe(1);
    expect(result.findings[0].aiExplanation?.provider).toBe('deepseek');
    expect(result.findings[0].aiExplanation?.rawEvidenceScope).toContain('node/script-target-missing');
  });
});
