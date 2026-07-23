import type { Analyzer } from '@codedoctor/shared';
import { finding } from './utils.js';

export const testAnalyzer: Analyzer = {
  id: 'test',
  name: 'Test Signal Analyzer',
  capability: {
    languages: ['any'],
    frameworks: ['any'],
    projectTypes: ['any'],
    filePatterns: ['**/*.test.*', '**/*.spec.*', 'package.json'],
    categories: ['test'],
    confidence: 'medium',
    requiresExternalTool: false,
    requiresNetwork: false,
    requiresAI: false,
    optional: false
  },
  canRun: () => true,
  async analyze(context) {
    const hasTestFile = context.files.files.some((file) => /(\.test\.|\.spec\.|^tests\/|^test\/)/.test(file.path));
    const packageFile = context.files.byPath['package.json'];
    let hasTestScript = false;
    if (packageFile) {
      const content = await import('node:fs/promises').then((fs) => fs.readFile(packageFile.absolutePath, 'utf8'));
      const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
      hasTestScript = Boolean(pkg.scripts?.test);
    }

    if (!hasTestFile && !hasTestScript) {
      return {
        analyzerId: 'test',
        findings: [
          finding({
            title: 'No test signal found',
            description: 'The project has no obvious tests or test script, reducing confidence that generated behavior is verified.',
            severity: 'medium',
            category: 'test',
            evidence: ['No test/spec files or package.json test script found.'],
            recommendation: 'Add a minimal automated test suite and document how to run it.',
            sourceAnalyzer: 'test',
            ruleId: 'test/no-test-signal',
            confidence: 0.76,
            tags: ['tests']
          })
        ]
      };
    }

    return { analyzerId: 'test', findings: [] };
  }
};
