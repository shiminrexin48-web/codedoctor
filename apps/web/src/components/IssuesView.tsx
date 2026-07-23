import type { Finding } from '@codedoctor/shared';
import { complexityLabels, severityLabels } from '../localization.js';
import type { FindingItem, SeverityFilter } from '../viewTypes.js';

interface FilterOption { value: SeverityFilter; label: string; count: number }

interface IssuesViewProps {
  findings: Finding[];
  filteredItems: FindingItem[];
  filterOptions: FilterOption[];
  selectedKey: string;
  selectedFinding?: Finding;
  severityFilter: SeverityFilter;
  highPriorityCount: number;
  onFilter(value: SeverityFilter): void;
  onSelect(key: string): void;
  onGoAi(): void;
}

function FindingRow({ item, selected, onSelect }: { item: FindingItem; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`finding-row ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span className={`severity ${item.finding.severity}`}>{severityLabels[item.finding.severity]}</span>
      <span className="finding-row__main"><strong>{item.finding.title}</strong><small>{item.finding.filePath ?? '项目级'} · {item.finding.ruleId}</small></span>
      <span className="confidence">{Math.round(item.finding.confidence * 100)}%</span>
    </button>
  );
}

export function IssuesView(props: IssuesViewProps) {
  const selected = props.selectedFinding;
  return (
    <section className="view-stack issues-view">
      <div className="view-heading">
        <div><p>问题</p><h2>集中处理扫描发现的问题</h2></div>
        <span>{props.severityFilter === 'all' ? `全部 ${props.findings.length}` : `${severityLabels[props.severityFilter]} ${props.filteredItems.length}`}</span>
      </div>
      <div className="issues-layout">
        <section className="surface issues-card">
          <div className="section-heading"><h2>问题队列</h2><span>{props.highPriorityCount} 个高优先级</span></div>
          <div className="filter-pills">{props.filterOptions.map((option) => <button className={props.severityFilter === option.value ? 'active' : ''} disabled={option.count === 0} key={option.value} onClick={() => props.onFilter(option.value)}><span>{option.label}</span><strong>{option.count}</strong></button>)}</div>
          <div className="finding-list">{props.filteredItems.length === 0 ? <p className="empty">当前筛选条件下没有问题。</p> : props.filteredItems.map((item) => <FindingRow item={item} selected={item.key === props.selectedKey} key={item.key} onSelect={() => props.onSelect(item.key)} />)}</div>
        </section>
        <section className="surface detail-card">
          {selected ? <>
            <div className="section-heading"><h2>当前问题</h2><span className={`severity ${selected.severity}`}>{severityLabels[selected.severity]}</span></div>
            <h3>{selected.title}</h3><p>{selected.description}</p>
            <dl><dt>文件</dt><dd>{selected.filePath ?? '项目级'}{selected.startLine ? `:${selected.startLine}` : ''}</dd><dt>分析器</dt><dd>{selected.sourceAnalyzer}</dd><dt>修复复杂度</dt><dd>{complexityLabels[selected.fixComplexity]}</dd></dl>
            <pre>{selected.codeSnippet ?? selected.evidence.join('\n')}</pre>
            {selected.trust ? <section className="trust-panel"><h3>可信度说明</h3><p>{selected.trust.whyMatched}</p><dl><dt>误报风险</dt><dd>{selected.trust.falsePositiveRisk}</dd><dt>分析范围</dt><dd>{selected.trust.scope}</dd></dl></section> : null}
            <h3>推荐修复</h3><p>{selected.recommendation}</p>
            <button className="inline-action detail-cta" onClick={props.onGoAi}>去 AI 分析这个问题</button>
          </> : <p className="empty">选择一个问题查看详情。</p>}
        </section>
      </div>
    </section>
  );
}
