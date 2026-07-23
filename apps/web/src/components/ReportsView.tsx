import type { CodeDoctorReport, Finding } from '@codedoctor/shared';
import { localizeCoverageNote } from '../localization.js';
import type { ProjectPortrait } from '../viewTypes.js';
import { ProjectConclusion } from './ProjectConclusion.js';

interface ReportsViewProps {
  report: CodeDoctorReport;
  findings: Finding[];
  portrait: ProjectPortrait;
  markdownPreview: string;
}

export function ReportsView({ report, findings, portrait, markdownPreview }: ReportsViewProps) {
  return (
    <section className="view-stack reports-view">
      <div className="view-heading"><div><p>报告</p><h2>查看 Markdown、覆盖范围和原始扫描摘要</h2></div><span>默认收起，按需展开</span></div>
      <div className="reports-layout">
        <ProjectConclusion report={report} findings={findings} />
        <section className="surface archive-card">
          <h2>收纳区</h2>
          <details className="compact-disclosure"><summary><span>Markdown 预览</span><small>report.md</small></summary><pre>{markdownPreview}</pre></details>
          <details className="compact-disclosure"><summary><span>分析器覆盖</span><small>{report.score.coverage.enabledAnalyzers.length} 项</small></summary><p>{report.score.coverage.notes[0] ? localizeCoverageNote(report.score.coverage.notes[0]) : '暂无覆盖说明。'}</p><div className="coverage-list">{report.score.coverage.enabledAnalyzers.map((item) => <span className="enabled" key={item}>{item}</span>)}{report.score.coverage.disabledAnalyzers.map((item) => <span className="disabled" key={item}>{item}</span>)}</div></details>
        </section>
        <section className="surface portrait-card">
          <h2>好信号与下一步</h2>
          <div className="info-block"><h3>好信号</h3><ul>{portrait.goodSignals.length ? portrait.goodSignals.map((signal) => <li key={signal}>{signal}</li>) : <li>暂未发现明显的项目健康信号。</li>}</ul></div>
          <div className="info-block"><h3>建议先做</h3><ol>{portrait.nextActions.map((action) => <li key={action}>{action}</li>)}</ol></div>
        </section>
        {report.maturity ? <section className="surface maturity-card"><div className="section-heading"><h2>项目成熟度评分</h2><span>{report.maturity.score}/100</span></div><div className="maturity-grid">{report.maturity.checks.map((check) => <div className={check.passed ? 'passed' : 'missing'} key={check.id}><strong>{check.label}</strong><small>{check.passed ? check.evidence : check.recommendation}</small></div>)}</div></section> : null}
      </div>
    </section>
  );
}
