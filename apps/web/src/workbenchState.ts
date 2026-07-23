import type { Finding } from '@codedoctor/shared';

export type ActiveView = 'overview' | 'issues' | 'ai' | 'reports';
const views = new Set<ActiveView>(['overview', 'issues', 'ai', 'reports']);

export function parseViewHash(hash: string): ActiveView {
  const value = hash.replace(/^#\/?/, '') as ActiveView;
  return views.has(value) ? value : 'overview';
}

export function viewHash(view: ActiveView): string {
  return `#/${view}`;
}

export function filterFindingsByQuery(findings: Finding[], query: string): Finding[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return findings;
  return findings.filter((finding) => [
    finding.title,
    finding.description,
    finding.filePath,
    finding.ruleId,
    finding.sourceAnalyzer,
    finding.recommendation,
    ...finding.evidence,
    ...finding.tags
  ].filter(Boolean).join('\n').toLocaleLowerCase().includes(needle));
}
