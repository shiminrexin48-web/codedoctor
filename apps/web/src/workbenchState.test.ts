import { describe, expect, it } from 'vitest';
import type { Finding } from '@codedoctor/shared';
import { filterFindingsByQuery, parseViewHash, viewHash } from './workbenchState.js';

const base: Finding = {
  id: 'one', title: '缺少入口文件', description: '脚本目标不存在', severity: 'high', category: 'build',
  filePath: 'package.json', evidence: ['server.js not found'], recommendation: '创建入口文件', sourceAnalyzer: 'node-dependency',
  ruleId: 'node/script-target-missing', confidence: 0.9, tags: [], applicableProjectTypes: ['node-web'], fixComplexity: 'easy', aiExplainable: true
};

describe('workbench state', () => {
  it('searches title, path, rule, evidence, and recommendation case-insensitively', () => {
    expect(filterFindingsByQuery([base], 'SERVER.JS')).toEqual([base]);
    expect(filterFindingsByQuery([base], 'script-target')).toEqual([base]);
    expect(filterFindingsByQuery([base], '创建入口')).toEqual([base]);
    expect(filterFindingsByQuery([base], 'unrelated')).toEqual([]);
  });

  it('round-trips known views and rejects invalid hashes', () => {
    expect(parseViewHash('#/ai')).toBe('ai');
    expect(parseViewHash('#/unknown')).toBe('overview');
    expect(viewHash('reports')).toBe('#/reports');
  });
});
