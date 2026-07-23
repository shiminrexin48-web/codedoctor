import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Finding, ProjectContext } from '@codedoctor/shared';
import { explainFindingWithDeepSeek, explainFindingWithModel } from './browserDeepSeek.js';

const finding: Finding = {
  id: 'f1', title: '疑似密钥被写入代码', description: '源码里出现疑似密钥。', severity: 'high', category: 'security',
  filePath: 'src/api.ts', evidence: ['Matched secret/api-key.'], recommendation: '移除密钥。', sourceAnalyzer: 'secret',
  ruleId: 'secret/api-key', confidence: 0.82, tags: [], applicableProjectTypes: ['generic'], fixComplexity: 'medium', aiExplainable: true
};
const projectContext: Pick<ProjectContext, 'detectedTypes' | 'languages' | 'frameworks'> = {
  detectedTypes: ['node-web'], languages: ['typescript'], frameworks: ['vite']
};

function stubSuccessfulResponse() {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ studentExplanation: '解释', riskImpact: '影响', repairSteps: ['步骤'], humanChecks: ['确认'] }) } }]
  }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('browser model explanation', () => {
  it('uses the local DeepSeek proxy and disables thinking', async () => {
    const fetchMock = stubSuccessfulResponse();
    const result = await explainFindingWithDeepSeek({ apiKey: 'test', finding, projectContext });
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(url).toBe('/api/providers/deepseek/chat/completions');
    expect(body.model).toBe('deepseek-chat');
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(result.repairSteps).toEqual(['步骤']);
  });

  it('uses OpenAI output token parameters without DeepSeek fields', async () => {
    const fetchMock = stubSuccessfulResponse();
    await explainFindingWithModel({ provider: 'openai', apiKey: 'test', model: 'gpt-5.4-mini', finding, projectContext });
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(url).toBe('/api/providers/openai/chat/completions');
    expect(body.max_completion_tokens).toBe(650);
    expect(body.thinking).toBeUndefined();
  });

  it('routes Qwen through its local compatible proxy', async () => {
    const fetchMock = stubSuccessfulResponse();
    await explainFindingWithModel({ provider: 'qwen', apiKey: 'test', model: 'qwen-plus', finding, projectContext });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/providers/qwen/chat/completions');
  });

  it('allows Ollama without a user API key', async () => {
    const fetchMock = stubSuccessfulResponse();
    await explainFindingWithModel({ provider: 'ollama', apiKey: '', model: 'qwen3:8b', finding, projectContext });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/providers/ollama/chat/completions');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer ollama');
  });
});
