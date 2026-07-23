import type { CodeDoctorReport } from '@codedoctor/shared';

export const demoReport: CodeDoctorReport = {
  version: '0.1.0',
  generatedAt: new Date().toISOString(),
  context: {
    rootPath: '/demo/ai-course-project',
    detectedTypes: ['generic', 'node-web'],
    languages: ['typescript', 'javascript'],
    frameworks: ['react', 'vite'],
    packageManagers: ['pnpm'],
    confidence: 0.92,
    evidence: [
      { type: 'file', path: 'package.json', description: '发现 Node 包清单', weight: 0.35 },
      { type: 'config', path: 'vite.config.ts', description: '发现 Vite 配置', weight: 0.18 }
    ],
    recommendedAnalyzers: ['universal', 'secret', 'node-dependency', 'test', 'ai-coding-smell'],
    unsupportedAreas: [],
    files: {
      files: [],
      byPath: {},
      scope: {
        totalFiles: 42,
        scannedFiles: 38,
        productionFiles: 18,
        testFiles: 7,
        fixtureFiles: 3,
        generatedFiles: 4,
        documentationFiles: 3,
        configurationFiles: 7,
        ignoredDirectories: ['node_modules', 'dist']
      }
    }
  },
  analyzerResults: [
    { analyzerId: 'universal', findings: [] },
    { analyzerId: 'secret', findings: [] },
    { analyzerId: 'node-dependency', findings: [] },
    { analyzerId: 'test', findings: [] },
    { analyzerId: 'ai-coding-smell', findings: [] }
  ],
  findings: [
    {
      id: 'demo-1',
      title: 'package.json 脚本指向不存在的文件',
      description: 'package.json 中的脚本引用了一个当前项目里不存在的入口文件。',
      severity: 'high',
      category: 'build',
      filePath: 'package.json',
      evidence: ['scripts.start 执行 "node server.js"，但没有找到 server.js。'],
      recommendation: '创建被引用的入口文件，或把脚本改成真实存在的入口路径。',
      sourceAnalyzer: 'node-dependency',
      ruleId: 'node/script-target-missing',
      confidence: 0.95,
      tags: ['package-json', 'scripts'],
      applicableProjectTypes: ['node-web'],
      fixComplexity: 'easy',
      aiExplainable: true,
      trust: {
        whyMatched: 'package.json 的 scripts.start 指向 node server.js，但文件索引中没有 server.js。',
        falsePositiveRisk: 'low',
        scope: 'configuration'
      }
    },
    {
      id: 'demo-2',
      title: '空的 catch 代码块',
      description: '异常被捕获后直接忽略，这会隐藏运行时失败路径。',
      severity: 'high',
      category: 'bug',
      filePath: 'src/api.ts',
      startLine: 18,
      endLine: 18,
      codeSnippet: 'try { await fetch(url); } catch (error) { console.error(error); }',
      evidence: ['发现没有处理逻辑的 catch 代码块。'],
      recommendation: '记录、提示或恢复这个错误；不要静默吞掉异常。',
      sourceAnalyzer: 'ai-coding-smell',
      ruleId: 'ai-smell/empty-catch',
      confidence: 0.88,
      tags: ['error-handling'],
      applicableProjectTypes: ['generic'],
      fixComplexity: 'easy',
      aiExplainable: true,
      trust: {
        whyMatched: '源码中存在 catch 代码块且没有处理逻辑。',
        falsePositiveRisk: 'medium',
        scope: 'production'
      }
    }
  ],
  score: {
    overallScore: 82,
    scores: {
      projectHygiene: { score: 91, confidence: 'medium', findingCount: 1, explanation: '已运行通用工程健康检查。' },
      security: { score: 100, confidence: 'high', findingCount: 0, explanation: 'Secret 分析器没有发现凭据模式。' },
      maintainability: { score: 86, confidence: 'medium', findingCount: 1, explanation: '发现 1 个可维护性相关问题。' },
      test: { score: 76, confidence: 'medium', findingCount: 1, explanation: '没有发现明确的测试信号。' },
      dependency: { score: 88, confidence: 'high', findingCount: 1, explanation: '已运行 Node 依赖检查。' },
      buildAndRun: { score: 72, confidence: 'high', findingCount: 1, explanation: '发现脚本入口缺失。' },
      aiCodingRisk: { score: 80, confidence: 'medium', findingCount: 1, explanation: 'AI Coding 气味检查发现 1 个问题。' },
      frameworkSpecific: { score: 84, confidence: 'medium', findingCount: 0, explanation: '已覆盖 Node/Web；更深层框架检查仍有限。' }
    },
    coverage: {
      enabledAnalyzers: ['universal', 'secret', 'node-dependency', 'test', 'ai-coding-smell'],
      disabledAnalyzers: ['unity'],
      unsupportedAnalyzers: [],
      confidence: 0.83,
      notes: ['由于 MVP 已支持 Node 依赖分析器，因此 Node/Web 项目的覆盖置信度更高。']
    }
  },
  summary: { findingCount: 2, criticalCount: 0, highCount: 2, mediumCount: 0, lowCount: 0, infoCount: 0 },
  maturity: {
    score: 82,
    checks: [
      { id: 'readme', label: 'README', passed: true, weight: 12, evidence: 'Root README exists.', recommendation: 'Add README.' },
      { id: 'license', label: 'License', passed: false, weight: 8, evidence: 'License exists.', recommendation: 'Add a LICENSE file.' },
      { id: 'ci', label: 'CI', passed: false, weight: 14, evidence: 'CI workflow exists.', recommendation: 'Add CI workflow for test and build.' },
      { id: 'tests', label: 'Tests', passed: true, weight: 14, evidence: 'Tests are visible.', recommendation: 'Add automated tests.' },
      { id: 'lockfile', label: 'Reproducible dependencies', passed: true, weight: 12, evidence: 'Lockfile exists.', recommendation: 'Commit a lockfile.' },
      { id: 'security', label: 'Security policy', passed: false, weight: 10, evidence: 'Security policy exists.', recommendation: 'Add SECURITY.md.' },
      { id: 'contributing', label: 'Contribution guide', passed: false, weight: 8, evidence: 'Contribution guide exists.', recommendation: 'Add CONTRIBUTING.md.' },
      { id: 'env-example', label: 'Environment example', passed: true, weight: 8, evidence: 'Environment example exists.', recommendation: 'Add .env.example.' },
      { id: 'ignore', label: 'Ignore policy', passed: true, weight: 8, evidence: 'Ignore policy exists.', recommendation: 'Add ignore files.' },
      { id: 'entrypoint', label: 'Runnable entry', passed: true, weight: 6, evidence: 'Standard manifest exists.', recommendation: 'Add a manifest.' }
    ]
  },
  markdown: '# CodeDoctor 报告\n\n导入生成的 report.json 后，可以在这里预览 Markdown 报告。'
};
