import type { CodeDoctorReport, Finding } from '@codedoctor/shared';
import { scoreLabels, severityLabels } from '../localization.js';

const severityOrder: Record<Finding['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function ProjectConclusion({ report, findings }: { report: CodeDoctorReport; findings: Finding[] }) {
  if (report.score.eligibility?.status === 'ineligible') {
    return (
      <section className="surface project-conclusion unsupported-conclusion">
        <h2>无法可靠评分</h2>
        <p>{report.score.eligibility.reasons.join('；')}</p>
        <p>请导入受支持且已解压的单个源码项目根目录。</p>
      </section>
    );
  }
  const strengths = Object.entries(report.score.scores)
    .filter(([, dimension]) => dimension.score >= 90 && dimension.confidence !== 'low' && dimension.verified !== false)
    .map(([key, dimension]) => `${scoreLabels[key]} ${dimension.score} 分，当前静态覆盖未发现明显高风险。`)
    .slice(0, 4);
  const defects = [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.confidence - a.confidence).slice(0, 5);
  const missingMaturity = report.maturity?.checks.filter((check) => !check.passed).slice(0, 4) ?? [];
  const limitations = [
    '静态扫描没有运行真实业务流程，也不能证明外部服务可用。',
    '网页没有执行安装、测试、构建或启动命令；构建运行结果需要本地 CLI 或 CI 验证。',
    '当前没有接入完整依赖漏洞数据库，依赖安全结论仅覆盖本地规则证据。'
  ];
  return (
    <section className="surface project-conclusion">
      <div className="section-heading">
        <div>
          <h2>项目结论</h2>
          <p>{report.score.profile?.displayName ?? '通用源码项目'} · 识别置信度 {Math.round((report.score.profile?.confidence ?? report.context.confidence) * 100)}%</p>
        </div>
        <span>{report.score.eligibility?.status === 'limited' ? '结论有限' : '基于当前静态证据'}</span>
      </div>
      <div className="conclusion-grid">
        <div><h3>优点</h3><ul>{strengths.length ? strengths.map((item) => <li key={item}>{item}</li>) : <li>当前覆盖不足以确认稳定优势。</li>}</ul></div>
        <div><h3>主要缺陷</h3><ul>{defects.length ? defects.map((finding) => <li key={finding.id}>{severityLabels[finding.severity]}：{finding.title}</li>) : <li>当前静态规则没有发现明确缺陷。</li>}</ul></div>
        <div><h3>建议顺序</h3><ol>{defects.slice(0, 3).map((finding) => <li key={finding.id}>{finding.recommendation}</li>)}{missingMaturity.map((check) => <li key={check.id}>{check.recommendation}</li>)}</ol></div>
        <div><h3>评分边界</h3><ul>{limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
    </section>
  );
}
