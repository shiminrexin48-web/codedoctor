import type { Finding, FindingAiExplanation, ProjectContext } from '@codedoctor/shared';

export interface AIExplainInput {
  finding: Finding;
  codeSnippet?: string;
  projectContext: Pick<ProjectContext, 'detectedTypes' | 'languages' | 'frameworks'>;
  analyzerEvidence: string[];
}

export interface AIExplainOutput {
  studentExplanation: string;
  riskImpact: string;
  repairSteps: string[];
  optionalCodeExample?: string;
  humanChecks: string[];
}

export interface AIExplainer {
  id: 'openai' | 'deepseek' | 'ollama' | string;
  model: string;
  explain(input: AIExplainInput): Promise<AIExplainOutput>;
}

export class NoopAIExplainer implements AIExplainer {
  id = 'noop';
  model = 'none';

  async explain(input: AIExplainInput): Promise<AIExplainOutput> {
    return {
      studentExplanation: `This explanation is based only on analyzer evidence for: ${input.finding.title}.`,
      riskImpact: input.finding.description,
      repairSteps: [input.finding.recommendation],
      humanChecks: ['Confirm the finding is relevant to this project before changing behavior.']
    };
  }
}

export interface ExplainFindingsOptions {
  limit: number;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export async function explainFindings(
  findings: Finding[],
  context: ProjectContext,
  explainer: AIExplainer,
  options: ExplainFindingsOptions
): Promise<{ findings: Finding[]; explainedCount: number }> {
  const explainable = findings
    .map((finding, index) => ({ finding, index }))
    .filter(({ finding }) => finding.aiExplainable)
    .sort((a, b) => severityOrder[a.finding.severity] - severityOrder[b.finding.severity])
    .slice(0, Math.max(0, options.limit));

  const updated = [...findings];
  let explainedCount = 0;

  for (const item of explainable) {
    const output = await explainer.explain({
      finding: item.finding,
      codeSnippet: item.finding.codeSnippet,
      projectContext: {
        detectedTypes: context.detectedTypes,
        languages: context.languages,
        frameworks: context.frameworks
      },
      analyzerEvidence: item.finding.evidence
    });

    const aiExplanation: FindingAiExplanation = {
      provider: explainer.id,
      model: explainer.model,
      generatedAt: new Date().toISOString(),
      ...output,
      rawEvidenceScope: [
        item.finding.ruleId,
        item.finding.filePath ?? 'project-level',
        ...item.finding.evidence
      ]
    };

    updated[item.index] = { ...item.finding, aiExplanation };
    explainedCount += 1;
  }

  return { findings: updated, explainedCount };
}
