import type { Finding } from '@codedoctor/shared';

export type SeverityFilter = 'all' | Finding['severity'];

export interface FindingItem {
  finding: Finding;
  originalIndex: number;
  key: string;
}

export interface ProjectPortrait {
  summary: string;
  projectKind: string;
  likelyPurpose: string;
  goodSignals: string[];
  riskSignals: string[];
  keyFiles: string[];
  nextActions: string[];
}
