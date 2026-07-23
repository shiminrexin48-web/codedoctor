import type { Analyzer, Finding } from '@codedoctor/shared';
import { finding, hasProjectType, isTextFile, lineInfo, readTextFile } from './utils.js';

export const unityAnalyzer: Analyzer = {
  id: 'unity',
  name: 'Unity Lightweight Analyzer',
  capability: {
    languages: ['csharp'],
    frameworks: ['unity'],
    projectTypes: ['unity'],
    filePatterns: ['Assets/**', 'Packages/manifest.json', 'ProjectSettings/**'],
    categories: ['config', 'maintainability', 'architecture'],
    confidence: 'medium',
    requiresExternalTool: false,
    requiresNetwork: false,
    requiresAI: false,
    optional: true
  },
  canRun: (context) => hasProjectType(context, 'unity'),
  async analyze(context) {
    const findings: Finding[] = [];
    if (context.files.files.some((file) => file.path.startsWith('Library/') || file.path.startsWith('Temp/'))) {
      findings.push(
        finding({
          title: 'Unity generated directory appears committed',
          description: 'Unity Library or Temp directories are generated locally and usually should not be committed.',
          severity: 'high',
          category: 'config',
          evidence: ['Found Library/ or Temp/ files in the project index.'],
          recommendation: 'Add Unity generated directories to .gitignore and remove them from source control.',
          sourceAnalyzer: 'unity',
          ruleId: 'unity/generated-directory-committed',
          confidence: 0.92,
          applicableProjectTypes: ['unity'],
          tags: ['unity', 'gitignore']
        })
      );
    }

    if (!context.files.byPath['Packages/manifest.json']) {
      findings.push(
        finding({
          title: 'Missing Unity package manifest',
          description: 'Packages/manifest.json was not found, making Unity package dependencies unclear.',
          severity: 'medium',
          category: 'dependency',
          evidence: ['Packages/manifest.json not found.'],
          recommendation: 'Commit Packages/manifest.json so collaborators can restore Unity packages.',
          sourceAnalyzer: 'unity',
          ruleId: 'unity/package-manifest-missing',
          confidence: 0.75,
          applicableProjectTypes: ['unity'],
          tags: ['unity', 'packages']
        })
      );
    }

    for (const file of context.files.files.filter((item) => item.path.endsWith('.cs') && isTextFile(item.path))) {
      const content = await readTextFile(file);
      if (!content) {
        continue;
      }
      const match = content.match(/\bFindObjectOfType\s*</);
      if (match?.index !== undefined) {
        const info = lineInfo(content, match.index);
        findings.push(
          finding({
            title: 'FindObjectOfType used in Unity script',
            description: 'FindObjectOfType can become expensive or brittle when used in runtime paths.',
            severity: 'low',
            category: 'maintainability',
            filePath: file.path,
            startLine: info.line,
            endLine: info.line,
            codeSnippet: info.snippet,
            evidence: ['Found FindObjectOfType usage.'],
            recommendation: 'Prefer serialized references, dependency injection, or cached references initialized once.',
            sourceAnalyzer: 'unity',
            ruleId: 'unity/find-object-of-type',
            confidence: 0.68,
            applicableProjectTypes: ['unity'],
            tags: ['unity', 'performance']
          })
        );
      }
    }

    return { analyzerId: 'unity', findings };
  }
};
