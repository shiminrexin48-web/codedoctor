import type { Analyzer } from '@codedoctor/shared';
import { aiCodingSmellAnalyzer } from './aiCodingSmellAnalyzer.js';
import { cppProjectAnalyzer } from './cppProjectAnalyzer.js';
import { javaProjectAnalyzer } from './javaProjectAnalyzer.js';
import { maintainabilityAnalyzer } from './maintainabilityAnalyzer.js';
import { nodeDependencyAnalyzer } from './nodeDependencyAnalyzer.js';
import { pythonProjectAnalyzer } from './pythonProjectAnalyzer.js';
import { repositoryHealthAnalyzer } from './repositoryHealthAnalyzer.js';
import { secretAnalyzer } from './secretAnalyzer.js';
import { testAnalyzer } from './testAnalyzer.js';
import { unityAnalyzer } from './unityAnalyzer.js';
import { universalAnalyzer } from './universalAnalyzer.js';

export interface AnalyzerRegistryOptions {
  disabledAnalyzers?: string[];
}

export function createDefaultAnalyzers(options: AnalyzerRegistryOptions = {}): Analyzer[] {
  const disabled = new Set(options.disabledAnalyzers ?? []);
  return [
    universalAnalyzer,
    maintainabilityAnalyzer,
    repositoryHealthAnalyzer,
    secretAnalyzer,
    nodeDependencyAnalyzer,
    pythonProjectAnalyzer,
    javaProjectAnalyzer,
    cppProjectAnalyzer,
    testAnalyzer,
    aiCodingSmellAnalyzer,
    unityAnalyzer
  ].filter((analyzer) => !disabled.has(analyzer.id));
}
