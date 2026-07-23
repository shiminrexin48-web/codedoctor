import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { CodeDoctorReport, Finding } from '@codedoctor/shared';
import { demoReport } from './demoReport.js';
import { localizeFinding, localizeMarkdownReport, severityLabels } from './localization.js';
import { buildProjectPortrait, buildRepairPrompt, findingKey, highPrioritySeverities, severityRank } from './projectInsights.js';
import { startBrowserScan, type ScanTask } from './scanRunner.js';
import type { SeverityFilter } from './viewTypes.js';
import { filterFindingsByQuery, parseViewHash, viewHash, type ActiveView } from './workbenchState.js';

function savedSeverityFilter(): SeverityFilter {
  const saved = sessionStorage.getItem('codedoctor.severity-filter') as SeverityFilter | null;
  return saved && ['all', 'critical', 'high', 'medium', 'low', 'info'].includes(saved) ? saved : 'all';
}

export const useReportWorkspace = () => {
  const [report, setReport] = useState<CodeDoctorReport>(demoReport);
  const [selectedKey, setSelectedKey] = useState(demoReport.findings[0] ? findingKey(demoReport.findings[0], 0) : '');
  const [loadState, setLoadState] = useState('已加载示例报告');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(savedSeverityFilter);
  const [activeView, setActiveView] = useState<ActiveView>(() => parseViewHash(window.location.hash));
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [scanStatus, setScanStatus] = useState<{ active: boolean; percent: number; currentPath?: string }>({ active: false, percent: 0 });
  const scanTaskRef = useRef<ScanTask | undefined>(undefined);

  const findingItems = useMemo(() => report.findings.map((finding, originalIndex) => {
    const localized = localizeFinding(finding);
    return { finding: localized, originalIndex, key: findingKey(localized, originalIndex) };
  }).sort((a, b) => severityRank(a.finding) - severityRank(b.finding)), [report.findings]);
  const findings = findingItems.map((item) => item.finding);
  const selectedItem = findingItems.find((item) => item.key === selectedKey) ?? findingItems[0];
  const selectedFinding = selectedItem?.finding;
  const portrait = useMemo(() => buildProjectPortrait(report, findings), [report, findings]);
  const repairPrompt = useMemo(() => buildRepairPrompt(report, findings, portrait), [report, findings, portrait]);
  const markdownPreview = useMemo(() => localizeMarkdownReport(report, findings), [report, findings]);
  const searchResults = useMemo(() => filterFindingsByQuery(findings, deferredSearchQuery).slice(0, 6), [findings, deferredSearchQuery]);
  const filteredFindingItems = severityFilter === 'all' ? findingItems : findingItems.filter((item) => item.finding.severity === severityFilter);
  const highPriorityCount = findings.filter((finding) => highPrioritySeverities.has(finding.severity)).length;
  const filterOptions = (['all', 'critical', 'high', 'medium', 'low', 'info'] as SeverityFilter[]).map((value) => ({
    value,
    label: value === 'all' ? '全部' : severityLabels[value],
    count: value === 'all' ? findings.length : findings.filter((finding) => finding.severity === value).length
  }));

  useEffect(() => {
    const handleHashChange = () => setActiveView(parseViewHash(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  useEffect(() => {
    const nextHash = viewHash(activeView);
    if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeView]);
  useEffect(() => sessionStorage.setItem('codedoctor.severity-filter', severityFilter), [severityFilter]);

  const loadReport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as CodeDoctorReport;
      if (!Array.isArray(parsed.findings) || !parsed.context || !parsed.score || !parsed.summary) throw new Error('不是有效的 CodeDoctor report.json');
      setReport(parsed);
      setSelectedKey(parsed.findings[0] ? findingKey(localizeFinding(parsed.findings[0]), 0) : '');
      setLoadState(`已加载 ${file.name}`);
    } catch (error) {
      setLoadState(error instanceof Error ? `报告导入失败：${error.message}` : '报告导入失败');
    }
  };

  const loadProject = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      scanTaskRef.current?.cancel();
      setLoadState('正在后台扫描项目...');
      setScanStatus({ active: true, percent: 0 });
      const task = startBrowserScan(files, (progress) => setScanStatus({ active: true, percent: progress.percent, currentPath: progress.currentPath }));
      scanTaskRef.current = task;
      const scanned = await task.promise;
      setReport(scanned);
      setSelectedKey(scanned.findings[0] ? findingKey(localizeFinding(scanned.findings[0]), 0) : '');
      setLoadState(`已扫描项目 ${scanned.context.rootPath}`);
    } catch (error) {
      setLoadState(error instanceof DOMException && error.name === 'AbortError' ? '扫描已取消，保留上一份报告' : error instanceof Error ? `项目扫描失败：${error.message}` : '项目扫描失败');
    } finally {
      scanTaskRef.current = undefined;
      setScanStatus((current) => ({ ...current, active: false }));
    }
  };

  const selectSearchResult = (finding: Finding) => {
    const item = findingItems.find((candidate) => candidate.finding.id === finding.id);
    if (!item) return;
    setSelectedKey(item.key);
    setSeverityFilter('all');
    setSearchQuery('');
    setActiveView('issues');
  };
  const applySeverityFilter = (value: SeverityFilter) => {
    setSeverityFilter(value);
    const next = value === 'all' ? findingItems[0] : findingItems.find((item) => item.finding.severity === value);
    if (next) setSelectedKey(next.key);
  };

  return {
    report, setReport, selectedKey, setSelectedKey, selectedItem, selectedFinding, findings, findingItems,
    loadState, severityFilter, activeView, setActiveView, searchQuery, setSearchQuery, searchResults, scanStatus,
    filteredFindingItems, filterOptions, portrait, repairPrompt, markdownPreview, highPriorityCount,
    analyzerCount: report.score.coverage.enabledAnalyzers.length,
    maturityMissingCount: report.maturity?.checks.filter((check) => !check.passed).length ?? 0,
    primaryNextAction: portrait.nextActions[0] ?? '先运行项目测试和构建命令，确认扫描结果与真实运行状态一致。',
    loadReport, loadProject, cancelScan: () => scanTaskRef.current?.cancel(), selectSearchResult, applySeverityFilter
  };
};
