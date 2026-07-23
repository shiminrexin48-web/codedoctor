import type { CodeDoctorReport, Finding } from '@codedoctor/shared';
import type { ActiveView } from '../workbenchState.js';
import type { ProjectPortrait } from '../viewTypes.js';
import { ScoreBreakdown } from './ScoreBreakdown.js';

interface OverviewViewProps {
  report: CodeDoctorReport;
  findings: Finding[];
  portrait: ProjectPortrait;
  loadState: string;
  primaryNextAction: string;
  highPriorityCount: number;
  maturityMissingCount: number;
  analyzerCount: number;
  onViewChange(view: ActiveView): void;
}

function scoreTone(score: number): string {
  if (score >= 90) return 'good';
  if (score >= 75) return 'warn';
  return 'risk';
}

export function OverviewView(props: OverviewViewProps) {
  const { report, findings, portrait } = props;
  const scope = report.context.files.scope;
  const unrated = report.score.eligibility?.status === 'ineligible';
  return (
    <section className="view-stack overview-view">
      <div className="view-heading">
        <div><p>总览</p><h2>先判断这个项目是什么，再决定从哪里修</h2></div>
        <span>{props.loadState}</span>
      </div>

      <section className="surface overview-hero">
        <div className="project-score large">
          <span>{unrated ? '评分状态' : '总体评分'}</span>
          {unrated ? <strong className="unrated">不评分</strong> : <strong className={scoreTone(report.score.overallScore)}>{report.score.overallScore}</strong>}
          <small>{report.score.profile?.displayName ?? portrait.projectKind}</small>
        </div>
        <div className="project-narrative">
          <h2>{report.score.profile?.displayName ?? portrait.projectKind}</h2>
          <p>{unrated ? report.score.eligibility?.reasons.join('；') : portrait.summary}</p>
          <div className="next-recommendation"><span>建议先做</span><strong>{props.primaryNextAction}</strong></div>
          <div className="overview-actions">
            <button className="inline-action" onClick={() => props.onViewChange('issues')}>查看问题</button>
            <button className="inline-action secondary" onClick={() => props.onViewChange('ai')}>生成修复提示词</button>
            <button className="inline-action ghost" onClick={() => props.onViewChange('reports')}>查看完整报告</button>
          </div>
        </div>
      </section>

      {unrated ? null : <ScoreBreakdown report={report} findings={findings} />}

      <section className="overview-metrics">
        <div className="surface metric-tile"><span>高优先级问题</span><strong className={props.highPriorityCount > 0 ? 'risk' : 'good'}>{props.highPriorityCount}</strong><small>进入“问题”页集中处理</small></div>
        <div className="surface metric-tile"><span>项目成熟度</span><strong className={scoreTone(report.maturity?.score ?? report.score.overallScore)}>{report.maturity?.score ?? '-'}</strong><small>{props.maturityMissingCount ? `${props.maturityMissingCount} 项待补齐` : '关键治理项完整'}</small></div>
        <div className="surface metric-tile"><span>扫描范围</span><strong>{scope?.productionFiles ?? report.context.files.files.length}</strong><small>生产源码文件</small></div>
        <div className="surface metric-tile"><span>分析覆盖</span><strong>{props.analyzerCount}</strong><small>启用分析器</small></div>
      </section>

      <section className="surface project-intel">
        <div className="project-intel__summary">
          <div><span>项目画像</span><h2>{portrait.likelyPurpose}</h2></div>
          <dl>
            <div><dt>技术栈</dt><dd>{report.context.detectedTypes.join(' / ')}</dd></div>
            <div><dt>语言</dt><dd>{report.context.languages.join(' / ')}</dd></div>
            <div><dt>识别置信度</dt><dd>{Math.round(report.context.confidence * 100)}%</dd></div>
          </dl>
        </div>
        <div className="project-intel__details">
          <details className="intel-disclosure">
            <summary><span><strong>扫描范围</strong><small>{scope?.scannedFiles ?? report.context.files.files.length} 个文件已进入分析</small></span><i aria-hidden="true">+</i></summary>
            <dl className="intel-scope-grid">
              <div><dt>生产源码</dt><dd>{scope?.productionFiles ?? 0}</dd></div>
              <div><dt>测试文件</dt><dd>{scope?.testFiles ?? 0}</dd></div>
              <div><dt>夹具示例</dt><dd>{scope?.fixtureFiles ?? 0}</dd></div>
              <div><dt>生成产物</dt><dd>{scope?.generatedFiles ?? 0}</dd></div>
              <div className="wide"><dt>已忽略目录</dt><dd>{scope?.ignoredDirectories.slice(0, 4).join(' / ') || '无'}</dd></div>
            </dl>
          </details>
          <details className="intel-disclosure">
            <summary><span><strong>关键证据</strong><small>{portrait.keyFiles.length} 个关键文件 · {portrait.riskSignals.length} 条风险信号</small></span><i aria-hidden="true">+</i></summary>
            <div className="intel-evidence-grid">
              <div><h3>关键文件</h3><ul>{portrait.keyFiles.length ? portrait.keyFiles.slice(0, 5).map((file) => <li key={file}>{file}</li>) : <li>暂无明确入口文件。</li>}</ul></div>
              <div><h3>优先风险</h3><ul>{portrait.riskSignals.slice(0, 3).map((signal) => <li key={signal}>{signal}</li>)}</ul></div>
            </div>
          </details>
        </div>
      </section>

      {report.maturity ? (
        <section className="surface maturity-card">
          <details className="overview-disclosure">
            <summary><span>项目成熟度明细</span><small>{report.maturity.score}/100 · {props.maturityMissingCount ? `${props.maturityMissingCount} 项待补齐` : '全部通过'}</small></summary>
            <div className="maturity-grid">{report.maturity.checks.map((check) => <div className={check.passed ? 'passed' : 'missing'} key={check.id}><strong>{check.label}</strong><small>{check.passed ? check.evidence : check.recommendation}</small></div>)}</div>
          </details>
        </section>
      ) : null}
    </section>
  );
}
