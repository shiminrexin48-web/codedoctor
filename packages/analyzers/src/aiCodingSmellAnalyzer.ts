import type { Analyzer, Finding } from '@codedoctor/shared';
import { finding, isProductionSourcePath, isTextFile, lineInfo, readTextFile } from './utils.js';

const SMELLS = [
  {
    ruleId: 'ai-smell/placeholder',
    pattern: /(?:throw\s+new\s+(?:Error|UnsupportedOperationException)\s*\([^)]*\b(?:not implemented|todo)\b|raise\s+NotImplementedError\b|return\s+['"`](?:coming soon|not implemented|todo)\b|>\s*(?:lorem ipsum|coming soon)\b)/i,
    title: 'Placeholder text or stub remains',
    severity: 'medium' as const
  },
  {
    ruleId: 'ai-smell/hardcoded-localhost',
    pattern: /https?:\/\/localhost:\d+/i,
    title: 'Hard-coded localhost endpoint',
    severity: 'medium' as const
  },
  {
    ruleId: 'ai-smell/fake-success',
    pattern: /(?:temporarily|for now|mock).{0,40}(?:return|returns?)\s+(?:true|success|ok)/i,
    title: 'Possible fake success implementation',
    severity: 'high' as const
  },
  {
    ruleId: 'ai-smell/mock-data',
    pattern: /\b(?:const|let|var)\s+(?:mockData|fakeData|dummyData)\b|\b(?:mockData|fakeData|dummyData)\s*[:=]/,
    title: 'Mock data remains in implementation path',
    severity: 'medium' as const
  }
];

export const aiCodingSmellAnalyzer: Analyzer = {
  id: 'ai-coding-smell',
  name: 'AI Coding Smell Analyzer',
  capability: {
    languages: ['any'],
    frameworks: ['any'],
    projectTypes: ['any'],
    filePatterns: ['**/*'],
    categories: ['ai-smell', 'bug', 'maintainability'],
    confidence: 'medium',
    requiresExternalTool: false,
    requiresNetwork: false,
    requiresAI: false,
    optional: false
  },
  canRun: () => true,
  async analyze(context) {
    const findings: Finding[] = [];
    for (const file of context.files.files.filter((item) => isTextFile(item.path) && isProductionSourcePath(item.path))) {
      const content = await readTextFile(file);
      if (!content) {
        continue;
      }

      const emptyCatch = content.match(/catch\s*\([^)]*\)\s*\{\s*\}/m);
      if (emptyCatch?.index !== undefined) {
        const info = lineInfo(content, emptyCatch.index);
        findings.push(
          finding({
            title: 'Empty catch block',
            description: 'An exception is caught and ignored, which can hide broken runtime paths common in generated projects.',
            severity: 'high',
            category: 'bug',
            filePath: file.path,
            startLine: info.line,
            endLine: info.line,
            codeSnippet: info.snippet,
            evidence: ['Found catch block with no handling logic.'],
            recommendation: 'Log, surface, or recover from the error; avoid silently swallowing exceptions.',
            sourceAnalyzer: 'ai-coding-smell',
            ruleId: 'ai-smell/empty-catch',
            confidence: 0.88,
            tags: ['error-handling']
          })
        );
      }

      for (const smell of SMELLS) {
        const match = content.match(smell.pattern);
        if (match?.index === undefined) {
          continue;
        }
        const info = lineInfo(content, match.index);
        findings.push(
          finding({
            title: smell.title,
            description: 'The code contains a pattern frequently seen in unfinished AI-generated projects.',
            severity: smell.severity,
            category: 'ai-smell',
            filePath: file.path,
            startLine: info.line,
            endLine: info.line,
            codeSnippet: info.snippet,
            evidence: [`Matched ${smell.ruleId}.`],
            recommendation: 'Replace placeholder or local-only behavior with real configuration and implementation logic.',
            sourceAnalyzer: 'ai-coding-smell',
            ruleId: smell.ruleId,
            confidence: 0.72,
            tags: ['ai-coding-risk']
          })
        );
      }
    }

    return { analyzerId: 'ai-coding-smell', findings };
  }
};
