import type { Finding } from '@codedoctor/shared';
import { aiProviders, featuredProviders, providerGroups, type AiProviderId } from '../aiProviders.js';
import { severityLabels } from '../localization.js';

interface AiViewProps {
  selectedFinding?: Finding;
  provider: AiProviderId;
  apiKey: string;
  model: string;
  customEndpoint: string;
  aiStatus: string;
  isExplaining: boolean;
  directAiMode: boolean;
  estimatedTokens: number;
  requestAllowed: boolean;
  explainedCount: number;
  findingCount: number;
  promptStatus: string;
  repairPrompt: string;
  onProviderChange(value: AiProviderId): void;
  onKeyChange(value: string): void;
  onModelChange(value: string): void;
  onCustomEndpointChange(value: string): void;
  onDirectModeChange(value: boolean): void;
  onExplainCurrent(): void;
  onExplainNext(): void;
  onCopyPrompt(): void;
}

export function AiView(props: AiViewProps) {
  const finding = props.selectedFinding;
  const definition = aiProviders[props.provider];
  return (
    <section className="view-stack ai-view">
      <div className="view-heading">
        <div><p>AI</p><h2>选择模型，解释问题并生成修复方案</h2></div>
        <span>{props.explainedCount}/{props.findingCount} 已解释</span>
      </div>
      <div className="ai-layout">
        <section className="surface ai-key-card">
          <div className="section-heading"><div><h2>模型连接</h2><p>每个提供商独立保存配置</p></div><span>{props.isExplaining ? '模型解释中' : props.aiStatus}</span></div>

          <div className="provider-switch" aria-label="模型提供商">
            <div className="provider-shortcuts">
              {featuredProviders.map((id) => (
              <button type="button" className={props.provider === id ? 'active' : ''} aria-pressed={props.provider === id} key={id} onClick={() => props.onProviderChange(id)}>
                {aiProviders[id].shortName}
              </button>
              ))}
            </div>
            <label className="provider-select"><span>更多模型</span><select value={featuredProviders.includes(props.provider) ? '' : props.provider} onChange={(event) => event.target.value && props.onProviderChange(event.target.value as AiProviderId)}>
              <option value="">选择其他服务</option>
              {providerGroups.slice(1).map((group) => <optgroup label={group} key={group}>{(Object.keys(aiProviders) as AiProviderId[]).filter((id) => aiProviders[id].group === group).map((id) => <option value={id} key={id}>{aiProviders[id].name}</option>)}</optgroup>)}
            </select></label>
          </div>

          <div className="provider-summary"><strong>{definition.name}</strong><span>{definition.description}</span></div>
          <div className="ai-config-grid">
            <label><span>模型 ID</span><input className="key-input" list={`models-${props.provider}`} value={props.model} placeholder="输入模型 ID" onChange={(event) => props.onModelChange(event.target.value)} /></label>
            <datalist id={`models-${props.provider}`}>{definition.models.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</datalist>
            <label><span>API Key</span><input className="key-input" value={props.apiKey} type="password" autoComplete="off" placeholder={definition.keyOptional ? 'Ollama 不需要真实 Key' : `粘贴 ${definition.shortName} Key`} onChange={(event) => props.onKeyChange(event.target.value)} /></label>
          </div>
          {props.provider === 'custom' ? <label className="endpoint-field"><span>兼容 API 地址</span><input className="key-input" value={props.customEndpoint} type="url" placeholder="https://example.com/v1" onChange={(event) => props.onCustomEndpointChange(event.target.value)} /></label> : null}

          <div className="ai-privacy-row">
            <div><strong>凭据仅保存在当前会话</strong><span>刷新标签页仍有效，关闭会话后清除</span></div>
            <label className="ai-mode-toggle"><input type="checkbox" checked={props.provider === 'custom' || props.directAiMode} disabled={props.provider === 'custom'} onChange={(event) => props.onDirectModeChange(event.target.checked)} /><span>浏览器直连</span></label>
          </div>
          <p className={props.requestAllowed ? 'budget-note' : 'budget-note risk'}>单次只发送当前问题的规则证据，预计约 {props.estimatedTokens} tokens。{props.provider === 'custom' || props.directAiMode ? 'Key 会直接发送到所选服务。' : '请求默认经过本机开发代理。'}</p>
          <div className="repair-toolbar">
            <button className="inline-action" disabled={!finding || props.isExplaining || !props.requestAllowed} onClick={props.onExplainCurrent}>{props.isExplaining ? '解释中...' : `使用 ${definition.shortName} 解释`}</button>
            <button className="inline-action secondary" disabled={props.isExplaining} onClick={props.onExplainNext}>解释下一个高危</button>
          </div>
        </section>

        <section className="surface ai-focus-card">
          <div className="section-heading"><h2>当前分析对象</h2>{finding ? <span className={`severity ${finding.severity}`}>{severityLabels[finding.severity]}</span> : null}</div>
          {finding ? <><h3>{finding.title}</h3><p>{finding.description}</p>{finding.aiExplanation ? <section className="ai-panel"><h3>AI 解释</h3><p>{finding.aiExplanation.studentExplanation}</p><h3>风险影响</h3><p>{finding.aiExplanation.riskImpact}</p><h3>修复步骤</h3><ol>{finding.aiExplanation.repairSteps.map((step) => <li key={step}>{step}</li>)}</ol></section> : <p>尚未生成模型解释。完成左侧配置后即可分析。</p>}</> : <p className="empty">还没有选中的问题。</p>}
        </section>

        <section className="surface repair-card ai-repair-card">
          <div className="section-heading"><h2>AI 修复提示词</h2><span>{props.promptStatus}</span></div>
          <p>把扫描结果转换成 AI coding 可以直接执行的修复任务单。</p>
          <div className="repair-toolbar"><button className="inline-action" onClick={props.onCopyPrompt}>复制提示词</button></div>
          <textarea readOnly value={props.repairPrompt} />
        </section>
      </div>
    </section>
  );
}
