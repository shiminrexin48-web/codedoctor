import { useMemo, useState } from 'react';
import type { CodeDoctorReport, Finding, FindingCategory } from '@codedoctor/shared';
import { confidenceLabels, scoreLabels } from '../localization.js';

type ScoreKey = keyof CodeDoctorReport['score']['scores'];
type ScoreEntry = [ScoreKey, CodeDoctorReport['score']['scores'][ScoreKey]];

const fallbackWeights: Record<ScoreKey, number> = {
  projectHygiene: 15, security: 15, maintainability: 15, test: 15,
  dependency: 10, buildAndRun: 15, frameworkSpecific: 10, aiCodingRisk: 5
};

const categories: Record<ScoreKey, FindingCategory[]> = {
  projectHygiene: ['docs', 'config', 'architecture'], security: ['security'],
  maintainability: ['maintainability', 'architecture', 'bug'], test: ['test'], dependency: ['dependency'],
  buildAndRun: ['build', 'config'], frameworkSpecific: ['architecture', 'config', 'dependency'], aiCodingRisk: ['ai-smell']
};

export function ScoreBreakdown({ report, findings }: { report: CodeDoctorReport; findings: Finding[] }) {
  const entries = Object.entries(report.score.scores) as ScoreEntry[];
  const defaultKey = useMemo(
    () => entries.reduce((lowest, entry) => entry[1].score < lowest[1].score ? entry : lowest, entries[0])[0],
    [report.score.scores]
  );
  const [selectedKey, setSelectedKey] = useState<ScoreKey>(defaultKey);
  const selectedEntry = entries.find(([key]) => key === selectedKey) ?? entries[0];
  const [activeKey, dimension] = selectedEntry;
  const weight = dimension.weight ?? fallbackWeights[activeKey];
  const contribution = dimension.contribution ?? Math.round(dimension.score * weight) / 100;
  const related = findings.filter((finding) => categories[activeKey].includes(finding.category)).slice(0, 4);

  return (
    <section className="surface score-breakdown">
      <div className="section-heading score-breakdown-heading">
        <div>
          <h2>分数构成</h2>
          <p>选择维度查看扣分、证据和验证边界。</p>
        </div>
        <span>{report.score.eligibility?.status === 'limited' ? '有限静态评估' : `覆盖置信度 ${Math.round(report.score.coverage.confidence * 100)}%`}</span>
      </div>

      <div className="score-breakdown-layout">
        <div className="score-dimensions" aria-label="评分维度">
          {entries.map(([key, item]) => {
            const itemWeight = item.weight ?? fallbackWeights[key];
            const itemContribution = item.contribution ?? Math.round(item.score * itemWeight) / 100;
            return (
              <button
                className={`score-dimension ${key === activeKey ? 'selected' : ''}`}
                type="button"
                aria-pressed={key === activeKey}
                key={key}
                onClick={() => setSelectedKey(key)}
              >
                <span className="dimension-title">{scoreLabels[key]}</span>
                <strong>{item.score}</strong>
                <span className="dimension-track" aria-hidden="true"><i style={{ width: `${item.score}%` }} /></span>
                <small>权重 {itemWeight}% · 贡献 {itemContribution.toFixed(2)}</small>
              </button>
            );
          })}
        </div>

        <aside className="dimension-inspector" aria-live="polite">
          <div className="dimension-inspector__header">
            <div>
              <span>当前维度</span>
              <h3>{scoreLabels[activeKey]}</h3>
            </div>
            <strong>{dimension.score}</strong>
          </div>
          <p>{dimension.explanation}</p>
          <div className="dimension-stats">
            <div><span>分析状态</span><strong>{dimension.verified === false ? '待验证' : confidenceLabels[dimension.confidence]}</strong></div>
            <div><span>维度扣分</span><strong>{dimension.deduction ?? 100 - dimension.score}</strong></div>
            <div><span>影响总分</span><strong>-{(dimension.weightedDeduction ?? weight - contribution).toFixed(2)}</strong></div>
          </div>
          <div className="dimension-findings">
            <span>扣分依据</span>
            {related.length ? (
              <ul>{related.map((finding) => <li key={finding.id}>{finding.title}</li>)}</ul>
            ) : <p>当前覆盖范围内没有相关扣分项。</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
