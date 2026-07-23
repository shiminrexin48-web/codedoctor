import { describe, expect, it } from 'vitest';
import { aiProviders, defaultModel, featuredProviders, providerGroups } from './aiProviders.js';

describe('AI provider registry', () => {
  it('keeps common providers visible and every preset provider routable', () => {
    expect(featuredProviders).toEqual(['deepseek', 'openai', 'qwen', 'gemini']);
    expect(providerGroups).toContain('国内模型');
    expect(Object.keys(aiProviders)).toHaveLength(12);
    for (const provider of Object.values(aiProviders)) {
      if (provider.id === 'custom') continue;
      expect(provider.proxyEndpoint).toContain(`/api/providers/${provider.id}`);
      expect(defaultModel(provider.id)).not.toBe('');
    }
  });
});
