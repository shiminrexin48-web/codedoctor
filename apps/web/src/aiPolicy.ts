export const AI_INPUT_CHARACTER_BUDGET = 12_000;

export function resolveAiEndpoint(directMode: boolean): string {
  return directMode ? 'https://api.deepseek.com/chat/completions' : '/api/deepseek/chat/completions';
}

export function normalizeCompatibleEndpoint(value: string): string {
  const endpoint = value.trim().replace(/\/$/, '');
  if (!endpoint) return '';
  const parsed = new URL(endpoint);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('兼容 API 地址必须使用 http 或 https。');
  }
  return endpoint.endsWith('/chat/completions') ? endpoint : `${endpoint}/chat/completions`;
}

export function estimateAiRequest(serializedEvidence: string): { characters: number; estimatedTokens: number; allowed: boolean } {
  const characters = serializedEvidence.length;
  return {
    characters,
    estimatedTokens: Math.ceil(characters / 3),
    allowed: characters <= AI_INPUT_CHARACTER_BUDGET
  };
}
