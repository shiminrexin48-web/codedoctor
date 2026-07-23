import { useState } from 'react';
import type { CodeDoctorReport, Finding } from '@codedoctor/shared';
import { aiProviders, defaultModel, type AiProviderId } from './aiProviders.js';
import { estimateAiRequest } from './aiPolicy.js';
import { explainFindingWithModel } from './browserDeepSeek.js';
import { localizeFinding } from './localization.js';
import { highPrioritySeverities } from './projectInsights.js';
import type { FindingItem } from './viewTypes.js';

interface AiWorkspaceInput {
  report: CodeDoctorReport;
  setReport(report: CodeDoctorReport): void;
  selectedFinding?: Finding;
  selectedItem?: FindingItem;
  findingItems: FindingItem[];
  repairPrompt: string;
}

const savedProvider = (): AiProviderId => {
  const value = sessionStorage.getItem('codedoctor.ai.provider') as AiProviderId | null;
  return value && value in aiProviders ? value : 'deepseek';
};
const keyName = (provider: AiProviderId) => `codedoctor.ai.key.${provider}`;
const modelName = (provider: AiProviderId) => `codedoctor.ai.model.${provider}`;
const savedKey = (provider: AiProviderId) => sessionStorage.getItem(keyName(provider))
  ?? (provider === 'deepseek' ? sessionStorage.getItem('codedoctor.deepseek.key') : null)
  ?? '';

export const useAiWorkspace = ({ report, setReport, selectedFinding, selectedItem, findingItems, repairPrompt }: AiWorkspaceInput) => {
  const [provider, setProvider] = useState<AiProviderId>(savedProvider);
  const [apiKey, setApiKey] = useState(() => savedKey(savedProvider()));
  const [model, setModel] = useState(() => sessionStorage.getItem(modelName(savedProvider())) ?? defaultModel(savedProvider()));
  const [customEndpoint, setCustomEndpoint] = useState(() => sessionStorage.getItem('codedoctor.ai.custom-endpoint') ?? '');
  const [aiStatus, setAiStatus] = useState('模型尚未配置');
  const [isExplaining, setIsExplaining] = useState(false);
  const [promptStatus, setPromptStatus] = useState('可复制给 AI coding 工具');
  const [directAiMode, setDirectAiMode] = useState(() => sessionStorage.getItem('codedoctor.ai-direct-mode') === 'true');
  const requestEstimate = estimateAiRequest(JSON.stringify(selectedFinding ? {
    title: selectedFinding.title, description: selectedFinding.description, evidence: selectedFinding.evidence,
    recommendation: selectedFinding.recommendation, codeSnippet: selectedFinding.codeSnippet ?? ''
  } : {}));

  const selectProvider = (value: AiProviderId) => {
    setProvider(value);
    setApiKey(savedKey(value));
    setModel(sessionStorage.getItem(modelName(value)) ?? defaultModel(value));
    setAiStatus(`${aiProviders[value].name} 尚未配置`);
    sessionStorage.setItem('codedoctor.ai.provider', value);
  };
  const updateApiKey = (value: string) => {
    setApiKey(value);
    if (value.trim()) sessionStorage.setItem(keyName(provider), value.trim());
    else sessionStorage.removeItem(keyName(provider));
    setAiStatus(value.trim() ? `${aiProviders[provider].name} 已就绪` : `${aiProviders[provider].name} 尚未配置`);
  };
  const updateModel = (value: string) => {
    setModel(value);
    sessionStorage.setItem(modelName(provider), value);
  };
  const updateCustomEndpoint = (value: string) => {
    setCustomEndpoint(value);
    sessionStorage.setItem('codedoctor.ai.custom-endpoint', value);
  };
  const updateDirectMode = (value: boolean) => {
    setDirectAiMode(value);
    sessionStorage.setItem('codedoctor.ai-direct-mode', String(value));
  };
  const explainFindingAt = async (originalIndex: number) => {
    const finding = report.findings[originalIndex];
    if (!finding) return;
    if (!apiKey.trim() && !aiProviders[provider].keyOptional) {
      setAiStatus(`请先填写 ${aiProviders[provider].name} API Key`);
      return;
    }
    setIsExplaining(true);
    setAiStatus(`正在使用 ${aiProviders[provider].shortName} 解释`);
    try {
      const output = await explainFindingWithModel({
        provider, apiKey: apiKey.trim(), model, customEndpoint, finding: localizeFinding(finding),
        projectContext: { detectedTypes: report.context.detectedTypes, languages: report.context.languages, frameworks: report.context.frameworks },
        directMode: directAiMode
      });
      const updatedFindings = [...report.findings];
      updatedFindings[originalIndex] = {
        ...finding,
        aiExplanation: {
          provider, model, generatedAt: new Date().toISOString(), ...output,
          rawEvidenceScope: [finding.ruleId, finding.filePath ?? '项目级', ...finding.evidence]
        }
      };
      const explainedFindings = updatedFindings.filter((item) => item.aiExplanation).length;
      setReport({ ...report, findings: updatedFindings, ai: { provider, model, requested: true, explainedFindings, limit: Math.max(1, explainedFindings) } });
      setAiStatus(`${aiProviders[provider].shortName} 解释已生成`);
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : 'AI 解释失败');
    } finally {
      setIsExplaining(false);
    }
  };
  const explainHighPriority = async () => {
    const next = findingItems.find((item) => highPrioritySeverities.has(item.finding.severity) && !report.findings[item.originalIndex]?.aiExplanation);
    if (next) await explainFindingAt(next.originalIndex);
    else setAiStatus('高优先级问题已解释完');
  };
  const copyRepairPrompt = async () => {
    try { await navigator.clipboard.writeText(repairPrompt); setPromptStatus('修复提示词已复制'); }
    catch { setPromptStatus('复制失败，可手动选中复制'); }
  };

  return {
    provider, apiKey, model, customEndpoint, aiStatus, isExplaining, promptStatus, directAiMode,
    estimatedTokens: requestEstimate.estimatedTokens, requestAllowed: requestEstimate.allowed,
    explainedCount: report.findings.filter((finding) => finding.aiExplanation).length,
    selectProvider, updateApiKey, updateModel, updateCustomEndpoint, updateDirectMode,
    explainCurrent: () => selectedItem && void explainFindingAt(selectedItem.originalIndex),
    explainHighPriority: () => void explainHighPriority(), copyRepairPrompt: () => void copyRepairPrompt()
  };
};
