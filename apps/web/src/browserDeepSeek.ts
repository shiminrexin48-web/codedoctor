import type { Finding, ProjectContext } from '@codedoctor/shared';
import { aiProviders, type AiProviderId } from './aiProviders.js';
import { estimateAiRequest, normalizeCompatibleEndpoint } from './aiPolicy.js';

export interface BrowserExplainResult {
  studentExplanation: string;
  riskImpact: string;
  repairSteps: string[];
  optionalCodeExample?: string;
  humanChecks: string[];
}

interface CompatibleResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

interface ExplainInput {
  provider: AiProviderId;
  apiKey: string;
  model: string;
  finding: Finding;
  projectContext: Pick<ProjectContext, 'detectedTypes' | 'languages' | 'frameworks'>;
  directMode?: boolean;
  customEndpoint?: string;
}

export async function explainFindingWithModel(input: ExplainInput): Promise<BrowserExplainResult> {
  const evidencePayload = JSON.stringify({
    projectContext: input.projectContext,
    finding: {
      title: input.finding.title, description: input.finding.description, severity: input.finding.severity,
      category: input.finding.category, filePath: input.finding.filePath, startLine: input.finding.startLine,
      ruleId: input.finding.ruleId, confidence: input.finding.confidence, evidence: input.finding.evidence,
      recommendation: input.finding.recommendation, codeSnippet: input.finding.codeSnippet ?? ''
    }
  });
  const estimate = estimateAiRequest(evidencePayload);
  if (!estimate.allowed) throw new Error(`AI 输入约 ${estimate.estimatedTokens} tokens，超过本次预算，请缩小证据范围。`);
  if (!input.model.trim()) throw new Error('请先选择或填写模型 ID。');

  const provider = aiProviders[input.provider];
  const endpoint = input.provider === 'custom'
    ? normalizeCompatibleEndpoint(input.customEndpoint ?? '')
    : input.directMode ? provider.directEndpoint : provider.proxyEndpoint ?? provider.directEndpoint;
  if (!endpoint) throw new Error('请填写 OpenAI 兼容 API 地址。');

  const body: Record<string, unknown> = {
    model: input.model.trim(),
    messages: [
      {
        role: 'system',
        content: [
          '你是 CodeDoctor 的可选 AI 解释器。',
          '你不能发现新问题，不能扩大结论，只能基于 finding、代码片段和 analyzer evidence 解释。',
          '请用中文输出严格 JSON，不要输出 Markdown。',
          'JSON 格式：{"studentExplanation":"...","riskImpact":"...","repairSteps":["..."],"optionalCodeExample":"...","humanChecks":["..."]}'
        ].join('\n')
      },
      { role: 'user', content: evidencePayload }
    ],
    response_format: { type: 'json_object' },
    stream: false
  };
  if (input.provider === 'openai') body.max_completion_tokens = 650;
  else body.max_tokens = 650;
  if (input.provider === 'deepseek') body.thinking = { type: 'disabled' };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.apiKey || 'ollama'}` },
    body: JSON.stringify(body)
  });
  const payload = await response.json() as CompatibleResponse;
  if (!response.ok) throw new Error(payload.error?.message ?? `${provider.name} 请求失败：HTTP ${response.status}`);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${provider.name} 没有返回解释内容。`);
  const json = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return normalize(JSON.parse(json) as Partial<BrowserExplainResult>, input.finding.recommendation);
}

export function explainFindingWithDeepSeek(input: Omit<ExplainInput, 'provider' | 'model'> & { model?: string }) {
  return explainFindingWithModel({ ...input, provider: 'deepseek', model: input.model ?? 'deepseek-chat' });
}

function normalize(output: Partial<BrowserExplainResult>, fallbackRecommendation: string): BrowserExplainResult {
  return {
    studentExplanation: output.studentExplanation?.trim() || 'AI 未返回有效解释。',
    riskImpact: output.riskImpact?.trim() || '需要结合项目上下文人工确认影响。',
    repairSteps: Array.isArray(output.repairSteps) && output.repairSteps.length ? output.repairSteps.map(String) : [fallbackRecommendation],
    optionalCodeExample: output.optionalCodeExample?.trim(),
    humanChecks: Array.isArray(output.humanChecks) && output.humanChecks.length ? output.humanChecks.map(String) : ['确认 analyzer evidence 与当前项目上下文一致。']
  };
}
