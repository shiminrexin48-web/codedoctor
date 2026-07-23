import { createDefaultAnalyzers } from '@codedoctor/analyzers';
import { detectProject } from '@codedoctor/detectors';
import type { Analyzer, AnalyzerResult, Finding, ScanResult } from '@codedoctor/shared';

export interface ScanProjectOptions {
  rootPath: string;
  analyzers?: Analyzer[];
  disabledAnalyzers?: string[];
}

export async function scanProject(options: ScanProjectOptions): Promise<Omit<ScanResult, 'score'>> {
  const context = await detectProject(options.rootPath);
  const analyzers = options.analyzers ?? createDefaultAnalyzers({ disabledAnalyzers: options.disabledAnalyzers });
  const analyzerResults: AnalyzerResult[] = [];

  for (const analyzer of analyzers) {
    if (!analyzer.canRun(context)) {
      analyzerResults.push({
        analyzerId: analyzer.id,
        findings: [],
        skipped: true,
        skipReason: `Analyzer ${analyzer.id} does not match detected project capabilities.`
      });
      continue;
    }

    analyzerResults.push(await analyzer.analyze(context));
  }

  const findings: Finding[] = analyzerResults.flatMap((result) => result.findings);

  return {
    context,
    analyzerResults,
    findings,
    generatedAt: new Date().toISOString()
  };
}
