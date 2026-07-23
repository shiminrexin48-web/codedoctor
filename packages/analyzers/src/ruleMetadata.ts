import type { RuleMetadata } from '@codedoctor/shared';

export const ruleMetadata: RuleMetadata[] = [
  {
    ruleId: 'universal/readme-missing',
    analyzerId: 'universal',
    title: 'Missing README',
    description: 'Checks whether the project has entry documentation.',
    categories: ['docs'],
    defaultSeverity: 'low',
    falsePositiveRisk: 'low',
    productionOnly: false,
    applicableProjectTypes: ['any'],
    fixComplexity: 'easy'
  },
  {
    ruleId: 'repo/ci-missing',
    analyzerId: 'repository-health',
    title: 'CI workflow is missing',
    description: 'Checks whether the repository has an automated verification workflow.',
    categories: ['test'],
    defaultSeverity: 'medium',
    falsePositiveRisk: 'medium',
    productionOnly: false,
    applicableProjectTypes: ['any'],
    fixComplexity: 'medium'
  },
  {
    ruleId: 'secret/api-key',
    analyzerId: 'secret',
    title: 'Possible API key committed',
    description: 'Detects credential-like assignments in non-fixture source.',
    categories: ['security'],
    defaultSeverity: 'high',
    falsePositiveRisk: 'medium',
    productionOnly: false,
    applicableProjectTypes: ['any'],
    fixComplexity: 'medium'
  },
  {
    ruleId: 'ai-smell/empty-catch',
    analyzerId: 'ai-coding-smell',
    title: 'Empty catch block',
    description: 'Detects swallowed exceptions in production source paths.',
    categories: ['bug'],
    defaultSeverity: 'high',
    falsePositiveRisk: 'medium',
    productionOnly: true,
    applicableProjectTypes: ['any'],
    fixComplexity: 'easy'
  }
];

export function getRuleMetadata(ruleId: string): RuleMetadata | undefined {
  return ruleMetadata.find((rule) => rule.ruleId === ruleId);
}
