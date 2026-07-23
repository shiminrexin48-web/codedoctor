import type { CodeDoctorReport, Finding, ScoreDimension } from '@codedoctor/shared';

export const severityLabels: Record<Finding['severity'], string> = {
  critical: '严重',
  high: '高危',
  medium: '中危',
  low: '低危',
  info: '提示'
};

export const confidenceLabels: Record<ScoreDimension['confidence'], string> = {
  high: '高置信',
  medium: '中置信',
  low: '低置信'
};

export const complexityLabels: Record<Finding['fixComplexity'], string> = {
  easy: '简单',
  medium: '中等',
  hard: '较难'
};

export const scoreLabels: Record<string, string> = {
  projectHygiene: '工程健康',
  security: '安全',
  maintainability: '可维护性',
  test: '测试',
  dependency: '依赖健康',
  buildAndRun: '构建运行',
  aiCodingRisk: 'AI Coding 风险',
  frameworkSpecific: '框架专项'
};

const categoryLabels: Record<Finding['category'], string> = {
  security: '安全',
  bug: '缺陷',
  maintainability: '可维护性',
  architecture: '架构',
  test: '测试',
  dependency: '依赖',
  config: '配置',
  'ai-smell': 'AI Coding 风险',
  docs: '文档',
  build: '构建'
};

const ruleCopy: Record<string, Pick<Finding, 'title' | 'description' | 'recommendation'>> = {
  'universal/readme-missing': {
    title: '缺少 README',
    description: '项目根目录没有 README，用户很难确认项目用途、安装方式和运行步骤。',
    recommendation: '补充 README，至少说明项目用途、安装、运行、测试和已知限制。'
  },
  'universal/gitignore-missing': {
    title: '缺少 .gitignore',
    description: '项目没有 .gitignore，依赖目录、缓存、构建产物或本地密钥更容易被误提交。',
    recommendation: '根据技术栈添加 .gitignore，并排除依赖、缓存、构建产物和本地环境文件。'
  },
  'universal/dev-marker': {
    title: '残留开发标记',
    description: '代码里仍有 TODO、FIXME 或 HACK 一类标记，可能代表未完成逻辑。',
    recommendation: '完成对应逻辑，或把它转成带上下文的任务记录。'
  },
  'repo/license-missing': {
    title: '缺少 License 文件',
    description: '仓库根目录没有 License 文件，别人无法明确复用和分发边界。',
    recommendation: '如果项目准备共享或复用，添加合适的 LICENSE 文件。'
  },
  'repo/contributing-missing': {
    title: '缺少贡献指南',
    description: '仓库没有说明别人应该如何提交改动、运行测试或发起 PR。',
    recommendation: '添加 CONTRIBUTING.md，写清本地启动、分支、测试和 PR 约定。'
  },
  'repo/code-of-conduct-missing': {
    title: '缺少行为准则',
    description: '仓库没有定义社区参与者应遵守的沟通和协作边界。',
    recommendation: '添加 CODE_OF_CONDUCT.md，说明期望行为、禁止行为和非公开执行渠道。'
  },
  'repo/issue-template-missing': {
    title: '缺少 Issue 模板',
    description: '贡献者提交问题时没有结构化引导，复现信息、环境和隐私检查容易缺失。',
    recommendation: '在 .github/ISSUE_TEMPLATE 下添加缺陷和功能 Issue 表单。'
  },
  'repo/pr-template-missing': {
    title: '缺少 Pull Request 模板',
    description: 'Pull Request 没有统一记录改动范围、验证结果和剩余风险。',
    recommendation: '添加 PR 模板，覆盖目的、实现、测试、密钥检查、兼容性和风险。'
  },
  'repo/changelog-missing': {
    title: '缺少变更日志',
    description: '用户无法快速了解版本之间的重要功能和兼容性变化。',
    recommendation: '添加 CHANGELOG.md，维护 Unreleased 区域并为每次发布记录用户可见变化。'
  },
  'repo/dependency-updates-missing': {
    title: '未配置自动依赖更新',
    description: '依赖与 GitHub Actions 更新完全依赖人工发现和维护。',
    recommendation: '配置 Dependabot 或 Renovate，并对更新分组、限流和定期处理。'
  },
  'repo/security-policy-missing': {
    title: '缺少安全策略',
    description: '仓库没有说明安全问题的报告方式和支持范围。',
    recommendation: '添加 SECURITY.md，说明漏洞报告入口、支持版本和响应预期。'
  },
  'repo/ci-missing': {
    title: '缺少 CI 工作流',
    description: '仓库没有发现明显的持续集成配置，无法自动验证构建和测试。',
    recommendation: '添加 GitHub Actions 或其他 CI，在 PR 时执行安装、测试和构建。'
  },
  'repo/env-file-committed': {
    title: '提交了 .env 环境文件',
    description: '.env 通常包含本地配置或密钥，不应该进入源码包或仓库。',
    recommendation: '移除 .env，轮换可能暴露的凭据，只提交 .env.example。'
  },
  'repo/ds-store-committed': {
    title: '提交了 macOS 元数据文件',
    description: '.DS_Store 是本机系统文件，会污染源码包和代码审查。',
    recommendation: '删除 .DS_Store，并把它加入 .gitignore。'
  },
  'repo/node-modules-present': {
    title: '源码包中包含 node_modules',
    description: 'node_modules 是生成的依赖目录，会让项目变大、审查变困难，也容易混入第三方文件。',
    recommendation: '不要提交或分发 node_modules，依靠 package.json 和锁文件复现安装。'
  },
  'import/no-scannable-files': {
    title: '没有可扫描的项目文件',
    description: '这次导入没有产生 CodeDoctor 可以检查的源码文件。',
    recommendation: '请导入解压后的项目文件夹，不要导入空目录、快捷方式或纯生成产物目录。'
  },
  'import/multiple-roots': {
    title: '一次导入了多个项目根目录',
    description: '导入内容看起来来自多个顶层项目，分析结果会混在一起。',
    recommendation: '建议一次只导入一个项目文件夹，避免项目类型、入口和评分互相干扰。'
  },
  'import/archive-not-expanded': {
    title: '压缩包尚未解压',
    description: '浏览器扫描无法直接读取 zip、rar、7z 等压缩包内部源码。',
    recommendation: '请先解压压缩包，再导入解压后的项目文件夹。'
  },
  'import/no-readable-source': {
    title: '没有发现可读源码',
    description: '导入内容包含文件，但没有可读取的源码文本，可能是图片、文档、二进制或构建产物。',
    recommendation: '请导入真实源码目录，而不是只导入素材、文档、产物或二进制资源。'
  },
  'import/large-text-skipped': {
    title: '部分大文本文件已跳过',
    description: '有些文本文件太大，浏览器扫描时没有读取其内容。',
    recommendation: '检查这些文件是否是日志、生成文件、打包产物或数据转储，必要时从源码审查中排除。'
  },
  'secret/api-key': {
    title: '疑似密钥被写入代码',
    description: '源码里出现了类似 API Key、token、password 或 secret 的硬编码值。',
    recommendation: '从源码移除该值，轮换真实凭据，并改用环境变量或本地密钥管理方式加载。'
  },
  'secret/private-key': {
    title: '疑似私钥被写入代码',
    description: '源码里出现了私钥块，这通常是高风险安全问题。',
    recommendation: '立即从仓库移除私钥、轮换相关凭据，并检查提交历史。'
  },
  'secret/openai-like-key': {
    title: '疑似模型 API Key 被写入代码',
    description: '源码里出现了类似 sk- 开头的模型服务密钥。',
    recommendation: '从源码移除该值，轮换真实凭据，并改用环境变量加载。'
  },
  'secret/tencent-cloud-key': {
    title: '疑似腾讯云 SecretId 被写入代码',
    description: '源码里出现了 AKID 开头的腾讯云凭据标识。',
    recommendation: '移除硬编码凭据，轮换腾讯云密钥，并通过环境变量或密钥管理服务加载。'
  },
  'secret/mongodb-uri-credentials': {
    title: 'MongoDB 连接串包含账号密码',
    description: '源码里的 MongoDB URI 内嵌了用户名和密码。',
    recommendation: '把连接串移到环境变量，轮换数据库凭据，并避免在示例配置中放真实账号密码。'
  },
  'node/no-runnable-script': {
    title: '缺少可运行脚本',
    description: 'package.json 没有 dev、start 或 build 脚本，用户无法明确知道如何运行项目。',
    recommendation: '添加和真实入口一致的 dev、start 或 build 脚本。'
  },
  'node/script-target-missing': {
    title: 'package.json 脚本指向不存在的文件',
    description: 'package.json 中的脚本引用了一个当前项目里不存在的入口文件。',
    recommendation: '创建被引用的入口文件，或把脚本改成真实存在的入口路径。'
  },
  'node/missing-lockfile': {
    title: '缺少 Node 锁文件',
    description: '项目有 package.json，但没有 package-lock、pnpm-lock 或 yarn.lock，依赖安装结果不够可复现。',
    recommendation: '使用项目约定的包管理器生成并提交锁文件。'
  },
  'node/env-example-missing': {
    title: '缺少 .env.example',
    description: '项目没有 .env.example，环境变量需求不清晰，别人难以正确启动项目。',
    recommendation: '添加 .env.example，列出必要变量名，并使用安全占位值。'
  },
  'python/dependency-manifest-missing': {
    title: '缺少 Python 依赖清单',
    description: '项目存在 Python 源码，但没有 pyproject.toml、requirements.txt 或 Pipfile。',
    recommendation: '添加 pyproject.toml 或 requirements.txt，让运行依赖可复现。'
  },
  'python/lockfile-missing': {
    title: '缺少 Python 锁文件',
    description: '项目使用现代 Python 依赖清单，但没有对应锁文件。',
    recommendation: '如果项目要求可复现安装，提交 uv.lock、poetry.lock 或 Pipfile.lock。'
  },
  'python/test-signal-missing': {
    title: '没有发现 Python 测试',
    description: '项目没有 tests 目录，也没有 test_*.py 或 *_test.py 文件。',
    recommendation: '添加最小 pytest/unittest 测试，并在 README 中说明测试命令。'
  },
  'python/entrypoint-unclear': {
    title: 'Python 入口不清晰',
    description: '项目存在 Python 文件，但没有常见入口文件或 pyproject 元数据。',
    recommendation: '在 README 或 pyproject scripts 中说明运行入口。'
  },
  'python/broad-except': {
    title: 'Python 异常处理过宽或为空',
    description: '宽泛的 except 或 except 后直接 pass 会隐藏运行时失败。',
    recommendation: '捕获具体异常，并明确记录、重新抛出或恢复错误。'
  },
  'java/build-descriptor-missing': {
    title: '缺少 Java 构建描述',
    description: '项目存在 Java 源码，但没有 Maven 或 Gradle 构建文件。',
    recommendation: '添加 pom.xml、build.gradle 或 build.gradle.kts，让项目可以稳定构建。'
  },
  'java/gradle-wrapper-missing': {
    title: '缺少 Gradle Wrapper',
    description: '项目使用 Gradle，但没有提交 gradlew 或 gradlew.bat。',
    recommendation: '提交 Gradle Wrapper，确保协作者和 CI 使用一致的 Gradle 版本。'
  },
  'java/test-signal-missing': {
    title: '没有发现 Java 测试',
    description: '项目没有 src/test 目录，也没有常见的 *Test.java 文件。',
    recommendation: '在 src/test/java 下添加单元测试或集成测试，并接入 Maven/Gradle。'
  },
  'java/empty-catch': {
    title: '空的 Java catch 代码块',
    description: '异常被捕获后直接忽略，会隐藏真实运行失败。',
    recommendation: '记录、重新抛出或明确处理异常，不要静默吞掉。'
  },
  'java/system-out': {
    title: 'Java 业务代码使用控制台输出',
    description: 'System.out/System.err 在生产服务中难以控制日志级别和输出位置。',
    recommendation: '改用项目日志框架，让日志级别、格式和目的地可配置。'
  },
  'cpp/build-descriptor-missing': {
    title: '缺少 C/C++ 构建描述',
    description: '项目存在 C/C++ 源码，但没有常见构建描述文件。',
    recommendation: '添加 CMake、Make、Conan 或 vcpkg 元数据，让项目可复现构建。'
  },
  'cpp/cmake-minimum-missing': {
    title: 'CMake 缺少最低版本声明',
    description: 'CMakeLists.txt 没有声明 cmake_minimum_required。',
    recommendation: '在 CMakeLists.txt 顶部添加 cmake_minimum_required(VERSION ...)。'
  },
  'cpp/clang-format-missing': {
    title: '缺少 C/C++ 格式化配置',
    description: '项目没有 .clang-format 或 _clang-format，代码风格难以统一。',
    recommendation: '添加 clang-format 配置，减少格式争议和无意义 diff。'
  },
  'cpp/test-signal-missing': {
    title: '没有发现 C/C++ 测试',
    description: '项目没有 tests/test 目录，也没有常见的 C/C++ 测试源文件。',
    recommendation: '添加轻量测试目标，并接入 CTest、Make 或 CI。'
  },
  'cpp/unsafe-c-api': {
    title: '使用不安全的 C/C++ API',
    description: '源码使用了容易导致缓冲区溢出的 C API。',
    recommendation: '使用带边界检查的替代方案，并开启编译器告警和 sanitizer。'
  },
  'test/no-test-signal': {
    title: '没有发现测试信号',
    description: '项目没有明显的测试文件或测试脚本，生成代码的行为缺少自动验证。',
    recommendation: '添加最小自动化测试，并在 README 中说明如何运行。'
  },
  'ai-smell/placeholder': {
    title: '残留占位文本或 stub',
    description: '代码中有 placeholder、stub、not implemented 等未完成实现痕迹。',
    recommendation: '替换为真实实现，或明确标记为不可用功能并从主路径移除。'
  },
  'ai-smell/empty-catch': {
    title: '空的 catch 代码块',
    description: '异常被捕获后直接忽略，这会隐藏运行时失败路径。',
    recommendation: '记录、提示或恢复这个错误；不要静默吞掉异常。'
  },
  'ai-smell/fake-success': {
    title: '疑似伪成功实现',
    description: '代码中出现“暂时返回成功”一类实现，可能让功能看起来可用但实际没有完成。',
    recommendation: '用真实业务逻辑替换伪实现；如果功能未完成，应让调用方看到明确失败状态。'
  },
  'ai-smell/mock-data': {
    title: '主路径残留 mock 数据',
    description: '实现路径里仍使用 mockData、fakeData 或 dummyData，可能把演示数据当成真实逻辑。',
    recommendation: '把 mock 数据限制在测试或演示环境，主路径应接入真实数据来源或明确配置。'
  },
  'ai-smell/hardcoded-localhost': {
    title: '硬编码 localhost 接口',
    description: '代码里写死了 localhost 地址，部署或协作环境下通常会失效。',
    recommendation: '改用环境变量或配置文件管理 API 地址，并提供 .env.example。'
  }
};

export function localizeFinding(finding: Finding): Finding {
  const copy = ruleCopy[finding.ruleId];
  if (!copy) {
    return finding;
  }

  return { ...finding, ...copy };
}

export function localizeCoverageNote(note: string): string {
  if (note.includes('Node/Web coverage is higher')) {
    return '由于 MVP 已支持 Node 依赖分析器，因此 Node/Web 项目的覆盖置信度更高。';
  }
  if (note.includes('Stack-aware coverage is enabled') || note.includes('Browser scanner enabled stack-aware checks')) {
    return '已根据识别到的 Node/Python/Java/C/C++ 证据启用对应技术栈检查。';
  }
  if (note.includes('This scan mainly reflects universal project checks')) {
    return '本次扫描主要反映通用工程检查结果，不代表深度框架专项审查。';
  }
  if (note.startsWith('Detected project types:')) {
    return note.replace('Detected project types:', '识别出的项目类型：');
  }
  return note;
}

export function localizeMarkdownReport(report: CodeDoctorReport, findings: Finding[]): string {
  const scoreLines = Object.entries(report.score.scores)
    .map(([name, dimension]) => `| ${scoreLabels[name] ?? name} | ${dimension.score} | ${confidenceLabels[dimension.confidence]} | ${dimension.findingCount} |`)
    .join('\n');

  const findingLines = findings.length === 0
    ? '已启用分析器没有发现问题。'
    : findings.map((finding, index) => [
      `### ${index + 1}. ${finding.title}`,
      '',
      `- 严重程度：${severityLabels[finding.severity]}`,
      `- 分类：${categoryLabels[finding.category]}`,
      `- 分析器：${finding.sourceAnalyzer}`,
      `- 规则：${finding.ruleId}`,
      finding.filePath ? `- 文件：${finding.filePath}${finding.startLine ? `:${finding.startLine}` : ''}` : '- 文件：项目级',
      `- 证据：${finding.evidence.join('；')}`,
      `- 修复建议：${finding.recommendation}`,
      finding.aiExplanation ? [
        '',
        '**AI 解释**',
        '',
        `- 学生版解释：${finding.aiExplanation.studentExplanation}`,
        `- 风险影响：${finding.aiExplanation.riskImpact}`,
        `- 修复步骤：${finding.aiExplanation.repairSteps.join('；')}`,
        `- 人工确认：${finding.aiExplanation.humanChecks.join('；')}`
      ].join('\n') : ''
    ].join('\n')).join('\n\n');

  return [
    '# CodeDoctor 报告',
    '',
    `生成时间：${report.generatedAt}`,
    '',
    '## 项目识别',
    '',
    `- 根目录：${report.context.rootPath}`,
    `- 项目类型：${report.context.detectedTypes.join(', ')}`,
    `- 语言：${report.context.languages.join(', ')}`,
    `- 框架：${report.context.frameworks.join(', ')}`,
    `- 包管理器：${report.context.packageManagers.join(', ')}`,
    `- 检测置信度：${Math.round(report.context.confidence * 100)}%`,
    report.ai ? [
      '',
      '## AI 解释',
      '',
      `- 服务商：${report.ai.provider}`,
      `- 模型：${report.ai.model}`,
      `- 已解释问题：${report.ai.explainedFindings}/${report.ai.limit}`,
      report.ai.skippedReason ? `- 跳过原因：${report.ai.skippedReason}` : ''
    ].join('\n') : '',
    '',
    '## 分析器覆盖',
    '',
    `- 已启用：${report.score.coverage.enabledAnalyzers.join(', ') || '无'}`,
    `- 未启用：${report.score.coverage.disabledAnalyzers.join(', ') || '无'}`,
    `- 暂不支持：${report.score.coverage.unsupportedAnalyzers.join(', ') || '无'}`,
    '',
    ...report.score.coverage.notes.map((note) => `- ${localizeCoverageNote(note)}`),
    '',
    '## 评分',
    '',
    `总体评分：${report.score.overallScore}`,
    '',
    '| 维度 | 分数 | 置信度 | 问题数 |',
    '| --- | ---: | --- | ---: |',
    scoreLines,
    '',
    '## 问题统计',
    '',
    `- 总数：${report.summary.findingCount}`,
    `- 严重：${report.summary.criticalCount}`,
    `- 高危：${report.summary.highCount}`,
    `- 中危：${report.summary.mediumCount}`,
    `- 低危：${report.summary.lowCount}`,
    `- 提示：${report.summary.infoCount}`,
    '',
    '## 问题列表',
    '',
    findingLines,
    '',
    '## 报告限制',
    '',
    'CodeDoctor 只基于本次扫描收集到的分析器证据给出结论。通用检查不代表深度框架或引擎质量审查。'
  ].join('\n');
}
