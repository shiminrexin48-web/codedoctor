import { describe, expect, it } from 'vitest';
import { estimateAiRequest, normalizeCompatibleEndpoint, resolveAiEndpoint } from './aiPolicy.js';

describe('AI request policy', () => {
  it('uses a same-origin proxy unless direct mode is explicitly enabled', () => {
    expect(resolveAiEndpoint(false)).toBe('/api/deepseek/chat/completions');
    expect(resolveAiEndpoint(true)).toBe('https://api.deepseek.com/chat/completions');
  });

  it('blocks evidence beyond the character budget', () => {
    expect(estimateAiRequest('x'.repeat(2000)).allowed).toBe(true);
    expect(estimateAiRequest('x'.repeat(13000)).allowed).toBe(false);
  });

  it('normalizes only HTTP compatible endpoints', () => {
    expect(normalizeCompatibleEndpoint('https://example.com/v1/')).toBe('https://example.com/v1/chat/completions');
    expect(() => normalizeCompatibleEndpoint('file:///tmp/model')).toThrow('http 或 https');
  });
});
