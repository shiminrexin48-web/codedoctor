import { describe, expect, it } from 'vitest';
import { assertScanInput, scanProgress } from './scanPolicy.js';

describe('scan policy', () => {
  it('rejects too many files and excessive total bytes', () => {
    expect(() => assertScanInput(Array.from({ length: 5001 }, () => ({ size: 1 })))).toThrow('5000');
    expect(() => assertScanInput([{ size: 251 * 1024 * 1024 }])).toThrow('250 MB');
  });

  it('reports bounded progress', () => {
    expect(scanProgress(1, 4)).toEqual({ completed: 1, total: 4, percent: 25 });
    expect(scanProgress(0, 0)).toEqual({ completed: 0, total: 0, percent: 100 });
  });
});
