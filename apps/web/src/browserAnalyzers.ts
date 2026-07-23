import type { AnalyzerResult } from '@codedoctor/shared';
import type { BrowserProject } from './browserProject.js';
import {
  aiSmellAnalyzer,
  importIntakeAnalyzer,
  maintainabilityAnalyzer,
  repositoryHealthAnalyzer,
  secretAnalyzer,
  testAnalyzer,
  universalAnalyzer
} from './browserRepositoryAnalyzers.js';
import { cppAnalyzer, javaAnalyzer, nodeAnalyzer, pythonAnalyzer } from './browserLanguageAnalyzers.js';

export function runBrowserAnalyzers(project: BrowserProject): AnalyzerResult[] {
  return [
    importIntakeAnalyzer(project),
    universalAnalyzer(project),
    maintainabilityAnalyzer(project),
    repositoryHealthAnalyzer(project),
    secretAnalyzer(project),
    nodeAnalyzer(project),
    pythonAnalyzer(project),
    javaAnalyzer(project),
    cppAnalyzer(project),
    testAnalyzer(project),
    aiSmellAnalyzer(project)
  ];
}
