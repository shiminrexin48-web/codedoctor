import type { Analyzer, Finding } from '@codedoctor/shared';
import { finding, isFixturePath, isGeneratedPath, isTextFile, lineInfo, readTextFile } from './utils.js';

const SECRET_PATTERNS = [
  { rule: 'secret/private-key', pattern: /-----BEGIN (RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
  { rule: 'secret/openai-like-key', pattern: /\bsk[-_][A-Za-z0-9_-]{16,}\b/ },
  { rule: 'secret/aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { rule: 'secret/tencent-cloud-key', pattern: /\bAKID[A-Za-z0-9]{16,}\b/ },
  { rule: 'secret/mongodb-uri-credentials', pattern: /mongodb(?:\+srv)?:\/\/[^:\s/]+:[^@\s/]+@/i },
  { rule: 'secret/api-key', pattern: /\b(?:api[_-]?key|secret(?:Id|Key)?|token|password)\b\s*[:=]\s*["'][^"']{12,}["']/i }
];

export const secretAnalyzer: Analyzer = {
  id: 'secret',
  name: 'Secret Analyzer',
  capability: {
    languages: ['any'],
    frameworks: ['any'],
    projectTypes: ['any'],
    filePatterns: ['**/*'],
    categories: ['security', 'config'],
    confidence: 'high',
    requiresExternalTool: false,
    requiresNetwork: false,
    requiresAI: false,
    optional: false
  },
  canRun: () => true,
  async analyze(context) {
    const findings: Finding[] = [];
    for (const file of context.files.files.filter((item) => isTextFile(item.path) && !isFixturePath(item.path) && !isGeneratedPath(item.path))) {
      const content = await readTextFile(file);
      if (!content) {
        continue;
      }
      for (const secretPattern of SECRET_PATTERNS) {
        const match = content.match(secretPattern.pattern);
        if (match?.index !== undefined) {
          const info = lineInfo(content, match.index);
          findings.push(
            finding({
              title: 'Possible secret committed',
              description: 'A value matching a secret or credential pattern appears in source-controlled files.',
              severity: secretPattern.rule === 'secret/private-key' ? 'critical' : 'high',
              category: 'security',
              filePath: file.path,
              startLine: info.line,
              endLine: info.line,
              codeSnippet: info.snippet.replace(/(["'=:\s])[^"'=\s]{8,}/g, '$1[redacted]'),
              evidence: [`Matched ${secretPattern.rule}.`],
              recommendation: 'Remove the secret from source, rotate the credential, and load it through environment variables or a local secret store.',
              sourceAnalyzer: 'secret',
              ruleId: secretPattern.rule,
              confidence: 0.82,
              tags: ['secret', 'credential'],
              fixComplexity: 'medium'
            })
          );
        }
      }
    }

    return { analyzerId: 'secret', findings };
  }
};
