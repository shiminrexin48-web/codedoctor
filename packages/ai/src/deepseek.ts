import type { AIExplainInput, AIExplainOutput, AIExplainer } from './AIExplainer.js';

interface DeepSeekChoice {
  message?: {
    content?: string;
  };
}

interface DeepSeekResponse {
  choices?: DeepSeekChoice[];
  error?: {
    message?: string;
  };
}

export interface DeepSeekAIExplainerOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
}

export class DeepSeekAIExplainer implements AIExplainer {
  id = 'deepseek';
  model: string;
  private apiKey: string;
  private baseUrl: string;
  private maxTokens: number;

  constructor(options: DeepSeekAIExplainerOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'deepseek-v4-pro';
    this.baseUrl = options.baseUrl ?? 'https://api.deepseek.com';
    this.maxTokens = options.maxTokens ?? 650;
  }

  async explain(input: AIExplainInput): Promise<AIExplainOutput> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: [
              '你是 CodeDoctor 的可选 AI 解释器。',
              '你不能发现新问题，不能扩大结论，只能基于用户提供的 finding、代码片段和 analyzer evidence 解释。',
              '请用中文输出严格 JSON，不要输出 Markdown。',
              'JSON 格式：{"studentExplanation":"...","riskImpact":"...","repairSteps":["..."],"optionalCodeExample":"...","humanChecks":["..."]}'
            ].join('\n')
          },
          {
            role: 'user',
            content: JSON.stringify({
              projectContext: input.projectContext,
              finding: {
                title: input.finding.title,
                description: input.finding.description,
                severity: input.finding.severity,
                category: input.finding.category,
                filePath: input.finding.filePath,
                startLine: input.finding.startLine,
                ruleId: input.finding.ruleId,
                confidence: input.finding.confidence,
                recommendation: input.finding.recommendation
              },
              codeSnippet: input.codeSnippet ?? input.finding.codeSnippet ?? '',
              analyzerEvidence: input.analyzerEvidence
            })
          }
        ],
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        max_tokens: this.maxTokens,
        stream: false
      })
    });

    const payload = await response.json() as DeepSeekResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `DeepSeek request failed with HTTP ${response.status}`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek returned an empty explanation.');
    }

    return normalizeOutput(JSON.parse(content) as Partial<AIExplainOutput>, input.finding.recommendation);
  }
}

function normalizeOutput(output: Partial<AIExplainOutput>, fallbackRecommendation: string): AIExplainOutput {
  return {
    studentExplanation: output.studentExplanation?.trim() || 'AI 未返回有效解释。',
    riskImpact: output.riskImpact?.trim() || '需要结合项目上下文人工确认影响。',
    repairSteps: Array.isArray(output.repairSteps) && output.repairSteps.length > 0
      ? output.repairSteps.map((step) => String(step))
      : [fallbackRecommendation],
    optionalCodeExample: output.optionalCodeExample?.trim(),
    humanChecks: Array.isArray(output.humanChecks) && output.humanChecks.length > 0
      ? output.humanChecks.map((check) => String(check))
      : ['确认 analyzer evidence 与当前项目上下文一致。']
  };
}
