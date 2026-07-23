import type { Analyzer, Finding } from '@codedoctor/shared';
import { findDevelopmentMarker, finding, isGeneratedPath, isProductionSourcePath, isTextFile, lineInfo, readTextFile } from './utils.js';

export const universalAnalyzer: Analyzer = {
  id: 'universal',
  name: 'Universal Project Hygiene Analyzer',
  capability: {
    languages: ['any'],
    frameworks: ['any'],
    projectTypes: ['any'],
    filePatterns: ['README*', '.gitignore', '**/*'],
    categories: ['docs', 'maintainability', 'architecture', 'config'],
    confidence: 'medium',
    requiresExternalTool: false,
    requiresNetwork: false,
    requiresAI: false,
    optional: false
  },
  canRun: () => true,
  async analyze(context) {
    const findings: Finding[] = [];
    const hasReadme = context.files.files.some((file) => /^readme(\.md)?$/i.test(file.path));
    const hasGitignore = Boolean(context.files.byPath['.gitignore']);

    if (!hasReadme) {
      findings.push(
        finding({
          title: 'Missing README',
          description: 'The project has no README file, making setup and expected behavior harder to verify.',
          severity: 'low',
          category: 'docs',
          evidence: ['No README or README.md file found at project root.'],
          recommendation: 'Add a README with purpose, setup, run, test, and known limitation sections.',
          sourceAnalyzer: 'universal',
          ruleId: 'universal/readme-missing',
          confidence: 0.85,
          tags: ['documentation']
        })
      );
    }

    if (!hasGitignore) {
      findings.push(
        finding({
          title: 'Missing .gitignore',
          description: 'The project has no .gitignore file, increasing the chance of committed dependencies, caches, or secrets.',
          severity: 'medium',
          category: 'config',
          evidence: ['No .gitignore file found at project root.'],
          recommendation: 'Add a .gitignore tailored to the project stack.',
          sourceAnalyzer: 'universal',
          ruleId: 'universal/gitignore-missing',
          confidence: 0.9,
          tags: ['git']
        })
      );
    }

    for (const file of context.files.files) {
      if (!isGeneratedPath(file.path) && file.size > 1_000_000) {
        findings.push(
          finding({
            title: 'Large file committed',
            description: 'Large files can indicate generated artifacts, media, or dependency bundles committed into source.',
            severity: 'low',
            category: 'maintainability',
            filePath: file.path,
            evidence: [`File size is ${file.size} bytes.`],
            recommendation: 'Verify this file belongs in source control; move generated or binary assets to an appropriate storage path.',
            sourceAnalyzer: 'universal',
            ruleId: 'universal/large-file',
            confidence: 0.7,
            tags: ['repository-hygiene'],
            fixComplexity: 'medium'
          })
        );
      }

      if (!isTextFile(file.path) || !isProductionSourcePath(file.path)) {
        continue;
      }
      const content = await readTextFile(file);
      if (!content) {
        continue;
      }
      const marker = findDevelopmentMarker(content);
      if (marker) {
        const info = lineInfo(content, marker.index);
        findings.push(
          finding({
            title: 'Unresolved development marker',
            description: 'The file contains TODO, FIXME, or HACK markers that may represent unfinished implementation.',
            severity: 'info',
            category: 'maintainability',
            filePath: file.path,
            startLine: info.line,
            endLine: info.line,
            codeSnippet: info.snippet,
            evidence: [`Found ${marker.marker} marker in a source comment.`],
            recommendation: 'Resolve the marker or convert it into a tracked issue with context.',
            sourceAnalyzer: 'universal',
            ruleId: 'universal/dev-marker',
            confidence: 0.65,
            tags: ['todo']
          })
        );
      }
    }

    return { analyzerId: 'universal', findings };
  }
};
