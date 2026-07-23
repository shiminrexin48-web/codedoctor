import { stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { DeepSeekAIExplainer, explainFindings } from '@codedoctor/ai';
import { assessProjectMaturity, profileProject, scanProject } from '@codedoctor/core';
import { writeReports } from '@codedoctor/report';
import { scoreProject } from '@codedoctor/scoring';
import type { CodeDoctorReport } from '@codedoctor/shared';

interface CliOptions {
  command?: string;
  target: string;
  aiProvider?: 'deepseek';
  aiLimit: number;
  disabledAnalyzers: string[];
  help: boolean;
  version: boolean;
  errors: string[];
}

const VERSION = '0.1.0';
const HELP = `CodeDoctor ${VERSION}

用法:
  codedoctor scan [项目目录] [选项]
  codedoctor --help
  codedoctor --version

选项:
  --ai deepseek              使用 DeepSeek 解释高优先级问题
  --ai-limit <0-10>          限制单次 AI 解释数量，默认 3
  --disable-analyzer <id>    禁用指定分析器，可重复使用
  -h, --help                 显示帮助
  -v, --version              显示版本

示例:
  pnpm scan .
  pnpm scan /path/to/project --ai deepseek --ai-limit 2`;

function summary(findings: CodeDoctorReport['findings']): CodeDoctorReport['summary'] {
  return {
    findingCount: findings.length,
    criticalCount: findings.filter((finding) => finding.severity === 'critical').length,
    highCount: findings.filter((finding) => finding.severity === 'high').length,
    mediumCount: findings.filter((finding) => finding.severity === 'medium').length,
    lowCount: findings.filter((finding) => finding.severity === 'low').length,
    infoCount: findings.filter((finding) => finding.severity === 'info').length
  };
}

function parseArgs(argv: string[]): CliOptions {
  const [command, maybeTarget, ...rest] = argv;
  const options: CliOptions = {
    command,
    target: maybeTarget && !maybeTarget.startsWith('--') ? maybeTarget : '.',
    aiLimit: 3,
    disabledAnalyzers: [],
    help: argv.includes('--help') || argv.includes('-h'),
    version: argv.includes('--version') || argv.includes('-v'),
    errors: []
  };
  const flags = maybeTarget?.startsWith('--') ? [maybeTarget, ...rest] : rest;

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === '--help' || flag === '-h' || flag === '--version' || flag === '-v') continue;
    if (flag === '--ai') {
      const provider = flags[index + 1];
      if (provider === 'deepseek') {
        options.aiProvider = provider;
      } else {
        options.errors.push('--ai 目前仅支持 deepseek。');
      }
      index += 1;
      continue;
    }
    if (flag === '--ai-limit') {
      const parsed = Number(flags[index + 1]);
      if (Number.isFinite(parsed)) {
        options.aiLimit = Math.max(0, Math.min(10, Math.floor(parsed)));
      } else {
        options.errors.push('--ai-limit 需要 0 到 10 之间的数字。');
      }
      index += 1;
      continue;
    }
    if (flag === '--disable-analyzer') {
      const analyzerId = flags[index + 1];
      if (analyzerId) {
        options.disabledAnalyzers.push(analyzerId);
      } else {
        options.errors.push('--disable-analyzer 后需要分析器 ID。');
      }
      index += 1;
      continue;
    }
    options.errors.push(`未知参数: ${flag}`);
  }

  return options;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(HELP);
    return 0;
  }
  if (options.version) {
    console.log(VERSION);
    return 0;
  }
  if (options.command !== 'scan') {
    console.error('缺少 scan 命令。运行 codedoctor --help 查看用法。');
    return 1;
  }
  if (options.errors.length > 0) {
    console.error(options.errors.join('\n'));
    console.error('运行 codedoctor --help 查看完整用法。');
    return 1;
  }

  const basePath = process.env.INIT_CWD ?? process.cwd();
  const rootPath = isAbsolute(options.target) ? options.target : resolve(basePath, options.target);
  try {
    const target = await stat(rootPath);
    if (!target.isDirectory()) {
      console.error(`扫描目标不是目录: ${rootPath}`);
      return 1;
    }
  } catch {
    console.error(`扫描目录不存在或无法访问: ${rootPath}`);
    return 1;
  }
  const scan = await scanProject({ rootPath, disabledAnalyzers: options.disabledAnalyzers });
  let findings = scan.findings;
  let aiReport: CodeDoctorReport['ai'];

  if (options.aiProvider === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro';
    if (!apiKey) {
      aiReport = {
        provider: 'deepseek',
        model,
        requested: true,
        explainedFindings: 0,
        limit: options.aiLimit,
        skippedReason: 'DEEPSEEK_API_KEY is not set.'
      };
    } else {
      const explainer = new DeepSeekAIExplainer({ apiKey, model });
      const explained = await explainFindings(findings, scan.context, explainer, { limit: options.aiLimit });
      findings = explained.findings;
      aiReport = {
        provider: 'deepseek',
        model,
        requested: true,
        explainedFindings: explained.explainedCount,
        limit: options.aiLimit
      };
    }
  }

  const scanWithAi = { ...scan, findings };
  const profile = profileProject(scan.context);
  const score = scoreProject({ ...scanWithAi, profile });
  const report: CodeDoctorReport = {
    version: VERSION,
    ...scanWithAi,
    score,
    summary: summary(findings),
    maturity: assessProjectMaturity(scan.context),
    ai: aiReport
  };
  const paths = await writeReports(rootPath, report);
  const eligibility = score.eligibility ?? profile.eligibility;

  console.log('CodeDoctor 扫描完成');
  console.log(`项目: ${rootPath}`);
  if (eligibility.status === 'ineligible') {
    console.log('评分: 未评分');
    console.log(`原因: ${eligibility.reasons.join('；')}`);
  } else {
    console.log(`评分: ${score.overallScore}/100${eligibility.status === 'limited' ? '（受限评分）' : ''}`);
  }
  console.log(`问题: ${report.summary.findingCount}`);
  console.log(`JSON 报告: ${paths.jsonPath}`);
  console.log(`Markdown 报告: ${paths.markdownPath}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().then((code) => {
    process.exitCode = code;
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
