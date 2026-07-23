export type ProjectType =
  | 'generic'
  | 'node-web'
  | 'java'
  | 'python'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'dotnet'
  | 'unity'
  | 'unreal';

export type Language =
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'python'
  | 'csharp'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'unknown';

export type Framework =
  | 'react'
  | 'vue'
  | 'next'
  | 'vite'
  | 'spring-boot'
  | 'django'
  | 'fastapi'
  | 'unity'
  | 'unreal'
  | 'unknown';

export type PackageManager =
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'maven'
  | 'gradle'
  | 'pip'
  | 'uv'
  | 'poetry'
  | 'cmake'
  | 'make'
  | 'conan'
  | 'vcpkg'
  | 'go-mod'
  | 'cargo'
  | 'dotnet'
  | 'unity-packages'
  | 'unknown';

export interface DetectionEvidence {
  type: 'file' | 'directory' | 'content' | 'config';
  path: string;
  description: string;
  weight: number;
}

export interface UnsupportedArea {
  area: string;
  reason: string;
}

export interface ProjectFile {
  path: string;
  absolutePath: string;
  size: number;
  role?: 'production' | 'test' | 'fixture' | 'generated' | 'documentation' | 'configuration';
}

export interface ProjectFileIndex {
  files: ProjectFile[];
  byPath: Record<string, ProjectFile>;
  ignoredDirectories?: string[];
  scope?: ScanScope;
}

export interface ScanScope {
  totalFiles: number;
  scannedFiles: number;
  productionFiles: number;
  testFiles: number;
  fixtureFiles: number;
  generatedFiles: number;
  documentationFiles: number;
  configurationFiles: number;
  ignoredDirectories: string[];
}

export interface ProjectContext {
  rootPath: string;
  detectedTypes: ProjectType[];
  languages: Language[];
  frameworks: Framework[];
  packageManagers: PackageManager[];
  confidence: number;
  evidence: DetectionEvidence[];
  recommendedAnalyzers: string[];
  unsupportedAreas: UnsupportedArea[];
  files: ProjectFileIndex;
}

export type ProjectPurpose =
  | 'web-frontend'
  | 'backend-service'
  | 'cli'
  | 'automation-script'
  | 'data-ml'
  | 'library-sdk'
  | 'desktop-app'
  | 'mobile-app'
  | 'ide-browser-extension'
  | 'embedded-firmware'
  | 'system-tool'
  | 'serverless'
  | 'worker-scheduled-job'
  | 'database-project'
  | 'infrastructure'
  | 'template-education'
  | 'monorepo'
  | 'generic-source'
  | 'unity-project'
  | 'unreal-project';

export interface ScoreEligibility {
  status: 'eligible' | 'limited' | 'ineligible';
  reasons: string[];
}

export interface ProjectProfile {
  primaryPurpose: ProjectPurpose;
  displayName: string;
  confidence: number;
  candidates: ProjectPurpose[];
  evidence: string[];
  eligibility: ScoreEligibility;
}

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingCategory =
  | 'security'
  | 'bug'
  | 'maintainability'
  | 'architecture'
  | 'test'
  | 'dependency'
  | 'config'
  | 'ai-smell'
  | 'docs'
  | 'build';

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  category: FindingCategory;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  codeSnippet?: string;
  evidence: string[];
  recommendation: string;
  sourceAnalyzer: string;
  ruleId: string;
  confidence: number;
  tags: string[];
  applicableProjectTypes: ProjectType[];
  fixComplexity: 'easy' | 'medium' | 'hard';
  aiExplainable: boolean;
  trust?: {
    whyMatched: string;
    falsePositiveRisk: 'low' | 'medium' | 'high';
    scope: ProjectFile['role'] | 'project';
  };
  aiExplanation?: FindingAiExplanation;
}

export interface FindingAiExplanation {
  provider: string;
  model: string;
  generatedAt: string;
  studentExplanation: string;
  riskImpact: string;
  repairSteps: string[];
  optionalCodeExample?: string;
  humanChecks: string[];
  rawEvidenceScope: string[];
}

export interface AnalyzerCapability {
  languages: Language[] | ['any'];
  frameworks: Framework[] | ['any'];
  projectTypes: ProjectType[] | ['any'];
  filePatterns: string[];
  categories: FindingCategory[];
  confidence: 'high' | 'medium' | 'low';
  requiresExternalTool: boolean;
  requiresNetwork: boolean;
  requiresAI: boolean;
  optional: boolean;
}

export interface AnalyzerResult {
  analyzerId: string;
  findings: Finding[];
  skipped?: boolean;
  skipReason?: string;
}

export interface Analyzer {
  id: string;
  name: string;
  capability: AnalyzerCapability;
  canRun(context: ProjectContext): boolean;
  analyze(context: ProjectContext): Promise<AnalyzerResult>;
}

export interface RuleMetadata {
  ruleId: string;
  analyzerId: string;
  title: string;
  description: string;
  categories: FindingCategory[];
  defaultSeverity: FindingSeverity;
  falsePositiveRisk: 'low' | 'medium' | 'high';
  productionOnly: boolean;
  applicableProjectTypes: ProjectType[] | ['any'];
  fixComplexity: 'easy' | 'medium' | 'hard';
}

export interface ScoreDimension {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  findingCount: number;
  explanation: string;
  weight?: number;
  contribution?: number;
  deduction?: number;
  weightedDeduction?: number;
  verified?: boolean;
}

export interface ScoreReport {
  overallScore: number;
  maximumScore?: number;
  profile?: ProjectProfile;
  eligibility?: ScoreEligibility;
  scores: {
    projectHygiene: ScoreDimension;
    security: ScoreDimension;
    maintainability: ScoreDimension;
    test: ScoreDimension;
    dependency: ScoreDimension;
    buildAndRun: ScoreDimension;
    aiCodingRisk: ScoreDimension;
    frameworkSpecific: ScoreDimension;
  };
  coverage: {
    enabledAnalyzers: string[];
    disabledAnalyzers: string[];
    unsupportedAnalyzers: string[];
    confidence: number;
    notes: string[];
  };
}

export interface ScanResult {
  context: ProjectContext;
  analyzerResults: AnalyzerResult[];
  findings: Finding[];
  score: ScoreReport;
  generatedAt: string;
}

export interface CodeDoctorReport extends ScanResult {
  version: string;
  summary: {
    findingCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
  };
  ai?: {
    provider: string;
    model: string;
    requested: boolean;
    explainedFindings: number;
    limit: number;
    skippedReason?: string;
  };
  maturity?: ProjectMaturityReport;
  markdown?: string;
}

export interface ProjectMaturityReport {
  score: number;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    weight: number;
    evidence: string;
    recommendation: string;
  }>;
}
