import type { CodeDoctorReport, Finding } from '@codedoctor/shared';
import { severityLabels } from './localization.js';
import type { ProjectPortrait } from './viewTypes.js';

export const highPrioritySeverities = new Set<Finding['severity']>(['critical', 'high']);

export function severityRank(finding: Finding): number {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[finding.severity];
}
export function findingKey(finding: Finding, index: number): string {
  return [
    finding.id,
    finding.ruleId,
    finding.filePath ?? 'project',
    finding.startLine ?? 0,
    index
  ].join(':');
}

function hasPath(report: CodeDoctorReport, pattern: RegExp): boolean {
  return report.context.files.files.some((file) => pattern.test(file.path));
}

function filesMatching(report: CodeDoctorReport, pattern: RegExp, limit = 6): string[] {
  return report.context.files.files
    .map((file) => file.path)
    .filter((path) => pattern.test(path))
    .slice(0, limit);
}

function describeProjectKind(report: CodeDoctorReport): string {
  if (report.findings.some((finding) => finding.ruleId === 'import/archive-not-expanded')) return '未解压的压缩包';
  if (report.findings.some((finding) => finding.ruleId === 'import/no-readable-source')) return '非源码或二进制资料目录';
  if (report.findings.some((finding) => finding.ruleId === 'import/multiple-roots')) return '多个项目混合导入';
  if (report.context.detectedTypes.includes('node-web')) {
    const hasServer = hasPath(report, /(^|\/)(server|app|index)\.js$/);
    const hasStaticUi = hasPath(report, /(^|\/)index\.html$/);
    if (hasServer && hasStaticUi) return 'Node/Express + 静态前端应用';
    if (hasServer) return 'Node 后端服务';
    return 'Node/Web 项目';
  }
  if (report.context.detectedTypes.includes('python')) {
    if (hasPath(report, /(^|\/)(main|app)\.py$/)) return 'Python API/脚本项目';
    return 'Python 项目';
  }
  if (report.context.detectedTypes.includes('java')) return 'Java 服务或库项目';
  if (report.context.detectedTypes.includes('cpp')) return 'C/C++ 原生项目';
  if (report.context.detectedTypes.includes('unity')) return 'Unity 项目';
  if (report.context.detectedTypes.includes('unreal')) return 'Unreal 项目';
  return '通用源码项目';
}

function inferPurpose(report: CodeDoctorReport): string {
  if (report.findings.some((finding) => finding.ruleId === 'import/archive-not-expanded')) {
    return '当前导入的是压缩包文件，浏览器无法直接查看内部源码；需要先解压再导入文件夹。';
  }
  if (report.findings.some((finding) => finding.ruleId === 'import/no-readable-source')) {
    return '当前导入内容更像媒体、文档、构建产物或二进制资产，不足以判断真实代码结构。';
  }
  if (report.findings.some((finding) => finding.ruleId === 'import/multiple-roots')) {
    return '当前一次导入了多个顶层目录，分析结果会混合多个项目，建议拆开逐个扫描。';
  }
  const packageFiles = report.context.files.files.filter((file) => file.path.endsWith('package.json'));
  const names = packageFiles.map((file) => file.path.replace(/\/?package\.json$/, '') || '根项目');
  const keywordSources = [
    ...report.context.frameworks.filter((item) => item !== 'unknown'),
    ...report.context.languages.filter((item) => item !== 'unknown'),
    ...report.findings.flatMap((finding) => finding.tags)
  ];
  if (hasPath(report, /(^|\/)(public|uploads|assets|images)\//i)) {
    return `疑似内容创作、媒体资源或 Web 展示类项目；包含 ${names.join('、')} 等模块。`;
  }
  if (report.context.detectedTypes.includes('python')) {
    return '疑似 Python API、数据处理或自动化脚本项目；可从 app/main.py、脚本目录和 pyproject 继续确认入口。';
  }
  if (keywordSources.length > 0) {
    return `从技术栈证据看，项目围绕 ${keywordSources.slice(0, 5).join('、')} 展开。`;
  }
  return '当前只能从文件结构判断项目用途；建议先补充 README 的项目目标和运行方式。';
}

export function buildProjectPortrait(report: CodeDoctorReport, findings: Finding[]): ProjectPortrait {
  const topRisks = findings.filter((finding) => highPrioritySeverities.has(finding.severity)).slice(0, 4);
  const enabled = new Set(report.score.coverage.enabledAnalyzers);
  const goodSignals = [
    hasPath(report, /^readme(\.md)?$/i) ? '有 README，陌生人能先读到项目说明。' : '',
    hasPath(report, /^license(\.md|\.txt)?$/i) ? '有 License，复用边界更清晰。' : '',
    hasPath(report, /^\.github\/workflows\/.+\.ya?ml$/i) ? '有 CI 工作流，具备自动验证基础。' : '',
    hasPath(report, /^security\.md$/i) || hasPath(report, /^\.github\/SECURITY\.md$/i) ? '有安全策略，安全问题报告路径清楚。' : '',
    enabled.has('repository-health') ? '已启用仓库健康度检查。' : '',
    enabled.has('secret') ? '已启用密钥扫描。' : ''
  ].filter(Boolean);
  const riskSignals = topRisks.map((finding) => `${severityLabels[finding.severity]}：${finding.title}${finding.filePath ? `（${finding.filePath}）` : ''}`);
  const keyFiles = [
    ...filesMatching(report, /(^|\/)(package\.json|pyproject\.toml|pom\.xml|build\.gradle|CMakeLists\.txt)$/),
    ...filesMatching(report, /(^|\/)(server|app|main|index)\.(js|ts|py|java|cpp)$/),
    ...filesMatching(report, /(^|\/)(README\.md|index\.html|\.env\.example)$/i)
  ].filter((value, index, array) => array.indexOf(value) === index).slice(0, 8);
  const nextActions = topRisks.length > 0
    ? topRisks.map((finding) => finding.recommendation).slice(0, 4)
    : ['先运行项目测试和构建命令，确认扫描结果与真实运行状态一致。'];

  return {
    projectKind: describeProjectKind(report),
    likelyPurpose: inferPurpose(report),
    summary: `${describeProjectKind(report)}，识别到 ${report.context.languages.join('、')}，当前评分 ${report.score.overallScore}，共有 ${report.summary.findingCount} 个问题，其中高优先级 ${report.summary.criticalCount + report.summary.highCount} 个。`,
    goodSignals: goodSignals.slice(0, 5),
    riskSignals: riskSignals.length ? riskSignals : ['没有发现高危问题，建议继续看中低危工程健康项。'],
    keyFiles,
    nextActions
  };
}

export function buildRepairPrompt(report: CodeDoctorReport, findings: Finding[], portrait: ProjectPortrait): string {
  const priorityFindings = findings
    .filter((finding) => finding.severity === 'critical' || finding.severity === 'high' || finding.severity === 'medium')
    .slice(0, 8);
  const findingLines = priorityFindings.length
    ? priorityFindings.map((finding, index) => [
      `${index + 1}. [${severityLabels[finding.severity]}] ${finding.title}`,
      `   - 规则：${finding.ruleId}`,
      `   - 文件：${finding.filePath ?? '项目级'}${finding.startLine ? `:${finding.startLine}` : ''}`,
      `   - 证据：${finding.evidence.join('；')}`,
      `   - 建议：${finding.recommendation}`
    ].join('\n')).join('\n')
    : '当前没有高/中优先级 Finding，请先运行测试和构建确认项目真实状态。';

  return [
    '你是资深代码审查和修复工程师。请基于以下 CodeDoctor 扫描结果修复项目。',
    '',
    '目标：',
    '1. 优先修复高危和中危问题，不要做无关重构。',
    '2. 不要删除用户业务功能，不要引入新的外部服务或大依赖。',
    '3. 如果发现密钥或 .env 被提交，只移除示例中的真实值并改为环境变量，不要在回复里复述敏感原文。',
    '4. 修改后补充必要的 README、.gitignore、.env.example、测试或 CI 配置。',
    '5. 最后运行项目已有测试/构建命令，并总结验证结果。',
    '',
    '项目画像：',
    `- 类型：${portrait.projectKind}`,
    `- 推断用途：${portrait.likelyPurpose}`,
    `- 技术栈：${report.context.detectedTypes.join(', ')} / ${report.context.languages.join(', ')} / ${report.context.frameworks.join(', ')}`,
    `- 总评分：${report.score.overallScore}`,
    `- 问题统计：共 ${report.summary.findingCount} 个，高优先级 ${report.summary.criticalCount + report.summary.highCount} 个，中危 ${report.summary.mediumCount} 个`,
    `- 关键文件：${portrait.keyFiles.join(', ') || '暂无明确关键文件'}`,
    '',
    '优先修复清单：',
    findingLines,
    '',
    '请输出：',
    '1. 你会先改哪些文件以及原因。',
    '2. 实际修改内容。',
    '3. 运行了哪些验证命令。',
    '4. 仍需人工确认的风险。'
  ].join('\n');
}
