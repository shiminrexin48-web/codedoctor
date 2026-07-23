export type AiProviderId =
  | 'deepseek' | 'openai' | 'qwen' | 'gemini' | 'moonshot' | 'zhipu'
  | 'siliconflow' | 'openrouter' | 'groq' | 'mistral' | 'ollama' | 'custom';

export interface AiProviderDefinition {
  id: AiProviderId;
  name: string;
  shortName: string;
  group: '常用' | '国内模型' | '国际与聚合' | '本地与自定义';
  description: string;
  models: Array<{ id: string; label: string }>;
  directEndpoint: string;
  proxyEndpoint?: string;
  keyOptional?: boolean;
}

export const aiProviders: Record<AiProviderId, AiProviderDefinition> = {
  deepseek: {
    id: 'deepseek', name: 'DeepSeek', shortName: 'DeepSeek', group: '常用', description: '中文代码解释与推理',
    models: [{ id: 'deepseek-chat', label: 'DeepSeek Chat' }, { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }],
    directEndpoint: 'https://api.deepseek.com/chat/completions', proxyEndpoint: '/api/providers/deepseek/chat/completions'
  },
  openai: {
    id: 'openai', name: 'OpenAI GPT', shortName: 'GPT', group: '常用', description: '复杂工程推理与代码审查',
    models: [{ id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' }, { id: 'gpt-5.4', label: 'GPT-5.4' }],
    directEndpoint: 'https://api.openai.com/v1/chat/completions', proxyEndpoint: '/api/providers/openai/chat/completions'
  },
  qwen: {
    id: 'qwen', name: '阿里云千问', shortName: '千问', group: '常用', description: '国内网络环境与中文项目',
    models: [{ id: 'qwen-plus', label: 'Qwen Plus' }, { id: 'qwen3-coder-plus', label: 'Qwen3 Coder Plus' }],
    directEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', proxyEndpoint: '/api/providers/qwen/chat/completions'
  },
  gemini: {
    id: 'gemini', name: 'Google Gemini', shortName: 'Gemini', group: '常用', description: 'Google Gemini 的 OpenAI 兼容接口',
    models: [{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }, { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }],
    directEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', proxyEndpoint: '/api/providers/gemini/chat/completions'
  },
  moonshot: {
    id: 'moonshot', name: '月之暗面 Kimi', shortName: 'Kimi', group: '国内模型', description: 'Kimi OpenAI 兼容接口',
    models: [{ id: 'kimi-k2', label: 'Kimi K2' }],
    directEndpoint: 'https://api.moonshot.cn/v1/chat/completions', proxyEndpoint: '/api/providers/moonshot/chat/completions'
  },
  zhipu: {
    id: 'zhipu', name: '智谱 GLM', shortName: 'GLM', group: '国内模型', description: 'GLM OpenAI 兼容接口',
    models: [{ id: 'glm-4.7', label: 'GLM-4.7' }, { id: 'glm-4.5-air', label: 'GLM-4.5 Air' }],
    directEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', proxyEndpoint: '/api/providers/zhipu/chat/completions'
  },
  siliconflow: {
    id: 'siliconflow', name: '硅基流动', shortName: '硅基', group: '国内模型', description: '汇集开源模型的兼容接口',
    models: [{ id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3' }, { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen Coder 32B' }],
    directEndpoint: 'https://api.siliconflow.cn/v1/chat/completions', proxyEndpoint: '/api/providers/siliconflow/chat/completions'
  },
  openrouter: {
    id: 'openrouter', name: 'OpenRouter', shortName: 'Router', group: '国际与聚合', description: '聚合多个国际模型服务',
    models: [{ id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 mini' }, { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' }],
    directEndpoint: 'https://openrouter.ai/api/v1/chat/completions', proxyEndpoint: '/api/providers/openrouter/chat/completions'
  },
  groq: {
    id: 'groq', name: 'Groq', shortName: 'Groq', group: '国际与聚合', description: '低延迟开源模型推理',
    models: [{ id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' }],
    directEndpoint: 'https://api.groq.com/openai/v1/chat/completions', proxyEndpoint: '/api/providers/groq/chat/completions'
  },
  mistral: {
    id: 'mistral', name: 'Mistral AI', shortName: 'Mistral', group: '国际与聚合', description: 'Mistral 的兼容对话接口',
    models: [{ id: 'mistral-large-latest', label: 'Mistral Large' }, { id: 'codestral-latest', label: 'Codestral' }],
    directEndpoint: 'https://api.mistral.ai/v1/chat/completions', proxyEndpoint: '/api/providers/mistral/chat/completions'
  },
  ollama: {
    id: 'ollama', name: 'Ollama 本地模型', shortName: 'Ollama', group: '本地与自定义', description: '本机运行的模型服务',
    models: [{ id: 'qwen3:8b', label: 'Qwen3 8B' }, { id: 'gpt-oss:20b', label: 'GPT-OSS 20B' }],
    directEndpoint: 'http://127.0.0.1:11434/v1/chat/completions', proxyEndpoint: '/api/providers/ollama/chat/completions', keyOptional: true
  },
  custom: {
    id: 'custom', name: '自定义兼容服务', shortName: '自定义', group: '本地与自定义', description: '支持 OpenAI Chat Completions 的可信服务',
    models: [], directEndpoint: ''
  }
};

export const featuredProviders: AiProviderId[] = ['deepseek', 'openai', 'qwen', 'gemini'];
export const providerGroups = ['常用', '国内模型', '国际与聚合', '本地与自定义'] as const;

export function defaultModel(provider: AiProviderId): string {
  return aiProviders[provider].models[0]?.id ?? '';
}
