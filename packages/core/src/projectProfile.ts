import type { ProjectContext, ProjectProfile, ProjectPurpose } from '@codedoctor/shared';

const sourcePattern = /\.(?:[cm]?[jt]sx?|py|java|kt|kts|cs|c|cc|cpp|cxx|h|hh|hpp|hxx|go|rs|swift|dart|rb|php|scala|sh)$/i;
const knownBinaryPattern = /\.(?:png|jpe?g|gif|webp|mp[34]|wav|fbx|blend|psd|pdf|zip|rar|7z|tar|gz|dll|so|dylib|exe)$/i;

const purposeLabels: Record<ProjectPurpose, string> = {
  'web-frontend': 'Web 前端', 'backend-service': '后端服务/API', cli: 'CLI 命令行工具',
  'automation-script': '脚本/自动化工具', 'data-ml': '数据处理/机器学习', 'library-sdk': '库/SDK',
  'desktop-app': '桌面应用', 'mobile-app': '移动应用', 'ide-browser-extension': 'IDE/浏览器扩展',
  'embedded-firmware': '嵌入式/固件', 'system-tool': '系统工具', serverless: 'Serverless/云函数',
  'worker-scheduled-job': '消息消费者/定时任务', 'database-project': '数据库工程', infrastructure: '基础设施即代码',
  'template-education': '模板/教学项目', monorepo: 'Monorepo/多包工程', 'generic-source': '通用源码项目',
  'unity-project': 'Unity 项目', 'unreal-project': 'Unreal Engine 项目'
};

function languageLabel(context: ProjectContext): string {
  const language = context.languages.find((item) => item !== 'unknown');
  const labels: Record<string, string> = { javascript: 'Node', typescript: 'TypeScript', python: 'Python', java: 'Java', csharp: '.NET/C#', cpp: 'C/C++', go: 'Go', rust: 'Rust' };
  return language ? labels[language] ?? language : '';
}

export function profileProject(context: ProjectContext): ProjectProfile {
  const paths = context.files.files.map((file) => file.path);
  const has = (pattern: RegExp) => paths.some((path) => pattern.test(path));
  const evidence: string[] = [];
  const candidates: ProjectPurpose[] = [];
  const add = (purpose: ProjectPurpose, reason: string) => {
    if (!candidates.includes(purpose)) candidates.push(purpose);
    evidence.push(reason);
  };

  if (context.detectedTypes.includes('unity') || has(/(^|\/)ProjectSettings\/ProjectVersion\.txt$/)) {
    return { primaryPurpose: 'unity-project', displayName: 'Unity 项目', confidence: 0.99, candidates: ['unity-project'], evidence: ['发现 Unity ProjectSettings/Assets 工程证据。'], eligibility: { status: 'ineligible', reasons: ['Unity 项目依赖专用编辑器和运行环境，当前网页版本不提供正式评分。'] } };
  }
  if (context.detectedTypes.includes('unreal') || has(/\.uproject$/i) || has(/\.uplugin$/i)) {
    return { primaryPurpose: 'unreal-project', displayName: 'Unreal Engine 项目', confidence: 0.99, candidates: ['unreal-project'], evidence: ['发现 .uproject/.uplugin 工程证据。'], eligibility: { status: 'ineligible', reasons: ['Unreal Engine 项目依赖专用引擎和构建工具，当前网页版本不提供正式评分。'] } };
  }

  const manifests = paths.filter((path) => /(^|\/)(package\.json|pyproject\.toml|pom\.xml|build\.gradle(?:\.kts)?|Cargo\.toml|go\.mod|CMakeLists\.txt)$/.test(path));
  if (has(/(^|\/)(pnpm-workspace\.yaml|lerna\.json|nx\.json|turbo\.json)$/) || manifests.length >= 2 && has(/^(packages|apps|services)\//)) add('monorepo', '发现工作区清单或多个子项目清单。');
  if (has(/(^|\/)(src\/)?cli\.[cm]?[jt]s$/i) || has(/(^|\/)bin\//) || has(/(^|\/)commands?\//) || has(/(^|\/)cmd\/[^/]+\/main\.go$/) || has(/(^|\/)src\/main\.rs$/) || has(/(^|\/)Program\.cs$/)) add('cli', '发现 CLI 入口、bin、commands 或标准命令行入口。');
  if (has(/(^|\/)(scripts?|automation|jobs?)\/.*\.(?:py|js|ts|sh)$/i)) add('automation-script', '发现脚本、自动化或任务目录。');
  if (has(/(^|\/)(notebooks?|datasets?|pipelines?|models?)\//i) || has(/\.ipynb$/i)) add('data-ml', '发现 notebook、数据集、流水线或模型目录。');
  if (has(/(^|\/)(api|server|controllers?|routes?)\//i) || context.frameworks.some((item) => ['spring-boot', 'django', 'fastapi'].includes(item))) add('backend-service', '发现服务端目录或 API 框架证据。');
  if (context.frameworks.some((item) => ['react', 'vue', 'next', 'vite'].includes(item)) || has(/(^|\/)index\.html$/)) add('web-frontend', '发现 Web 框架、组件或页面入口。');
  if (has(/(^|\/)include\//) || has(/(^|\/)src\/lib\//) || has(/(^|\/)lib\//)) add('library-sdk', '发现公共头文件、lib 或 SDK 结构。');
  if (has(/(^|\/)(electron|tauri|desktop)\//i) || has(/(^|\/)electron\.(?:js|ts)$/)) add('desktop-app', '发现桌面应用框架证据。');
  if (has(/(^|\/)(android|ios)\//i) || has(/pubspec\.yaml$/)) add('mobile-app', '发现移动应用工程证据。');
  if (has(/(^|\/)(Dockerfile|docker-compose\.ya?ml|terraform|k8s|helm|ansible)($|\/)/i) || has(/\.tf$/)) add('infrastructure', '发现容器、Kubernetes 或基础设施配置。');
  if (has(/(^|\/)(migrations?|schema)\//i)) add('database-project', '发现数据库迁移或 schema 目录。');
  if (has(/(^|\/)(examples?|template|starter)\//i)) add('template-education', '发现示例、模板或教学结构。');

  if (candidates.length === 0 && has(sourcePattern)) add('generic-source', '发现受支持源码，但缺少明确用途入口。');
  const primaryPurpose = candidates[0] ?? 'generic-source';
  const recognizableSource = has(sourcePattern) || paths.some((path) => path.startsWith('src/') && !knownBinaryPattern.test(path));
  const knownLanguage = context.languages.some((language) => language !== 'unknown');
  const eligibility = !recognizableSource
    ? { status: 'ineligible' as const, reasons: ['没有发现可评分的源码；输入可能只有二进制、媒体、文档或生成产物。'] }
    : !knownLanguage || primaryPurpose === 'generic-source'
      ? { status: 'limited' as const, reasons: ['源码用途或语言证据不足，仅提供有限静态评估。'] }
      : { status: 'eligible' as const, reasons: ['已识别受支持源码语言和项目用途。'] };
  const language = languageLabel(context);
  return {
    primaryPurpose,
    displayName: `${language ? `${language} ` : ''}${purposeLabels[primaryPurpose]}`,
    confidence: Math.min(0.96, Math.max(0.35, 0.45 + evidence.length * 0.14)),
    candidates,
    evidence: evidence.length ? evidence : ['项目用途证据不足。'],
    eligibility
  };
}
