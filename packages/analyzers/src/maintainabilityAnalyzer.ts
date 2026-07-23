import type { Analyzer, Finding } from '@codedoctor/shared';
import { finding, isProductionSourcePath, isTextFile, readTextFile } from './utils.js';

const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?|py|java|cs|c|cc|cpp|cxx|h|hh|hpp|hxx|go|rs)$/i;
const FUNCTION_START = /^\s*(?:export\s+)?(?:async\s+)?(?:function\s+\w+|(?:public|private|protected|static|final|virtual|override|inline|constexpr|async)\s+.*\(|(?:def|class)\s+\w+|[\w<>,\[\]?&*:]+\s+\w+\s*\([^;]*\)\s*\{)/;

function findLongFunction(content: string): { startLine: number; lines: number; branches: number } | undefined {
  const lines = content.split(/\r?\n/);
  for (let start = 0; start < lines.length; start += 1) {
    if (!FUNCTION_START.test(lines[start])) continue;
    const isPython = /^\s*(?:async\s+)?def\s+/.test(lines[start]);
    const baseIndent = lines[start].match(/^\s*/)?.[0].length ?? 0;
    let depth = 0;
    let opened = false;
    let branches = 0;
    for (let end = start; end < lines.length; end += 1) {
      const line = lines[end];
      branches += (line.match(/\b(?:if|else|for|while|case|catch|except|match)\b|&&|\|\|/g) ?? []).length;
      if (isPython) {
        if (end > start && line.trim() && (line.match(/^\s*/)?.[0].length ?? 0) <= baseIndent) {
          const length = end - start;
          if (length >= 120) return { startLine: start + 1, lines: length, branches };
          break;
        }
      } else {
        depth += (line.match(/\{/g) ?? []).length;
        depth -= (line.match(/\}/g) ?? []).length;
        opened ||= line.includes('{');
        if (opened && depth <= 0) {
          const length = end - start + 1;
          if (length >= 120) return { startLine: start + 1, lines: length, branches };
          break;
        }
      }
    }
  }
  return undefined;
}

export const maintainabilityAnalyzer: Analyzer = {
  id: 'maintainability',
  name: 'Source Maintainability Analyzer',
  capability: {
    languages: ['any'],
    frameworks: ['any'],
    projectTypes: ['any'],
    filePatterns: ['**/*.{js,jsx,ts,tsx,py,java,cs,c,cc,cpp,h,hpp,go,rs}'],
    categories: ['maintainability', 'architecture'],
    confidence: 'high',
    requiresExternalTool: false,
    requiresNetwork: false,
    requiresAI: false,
    optional: false
  },
  canRun: () => true,
  async analyze(context) {
    const findings: Finding[] = [];
    for (const file of context.files.files) {
      if (!SOURCE_EXTENSIONS.test(file.path) || !isTextFile(file.path) || !isProductionSourcePath(file.path)) continue;
      const content = await readTextFile(file);
      if (!content) continue;
      const lineCount = content.split(/\r?\n/).length;
      if (lineCount >= 600) {
        findings.push(finding({
          title: '生产源码文件职责过重',
          description: '单个生产源码文件过长，通常意味着多个职责、状态或规则集中在同一模块。',
          severity: lineCount >= 1000 ? 'medium' : 'low',
          category: 'maintainability',
          filePath: file.path,
          evidence: [`生产源码共 ${lineCount} 行，建议阈值小于 600 行。`],
          recommendation: '按业务职责拆分模块，优先提取纯函数、视图组件、规则集合或 I/O 适配器，并用测试保护现有行为。',
          sourceAnalyzer: 'maintainability',
          ruleId: 'maintainability/oversized-source-file',
          confidence: 0.92,
          tags: ['complexity', 'module-boundary'],
          fixComplexity: 'medium'
        }));
      }
      const longFunction = findLongFunction(content);
      if (longFunction) {
        findings.push(finding({
          title: '函数或组件过长',
          description: '函数体过长会增加理解、测试和安全修改的成本。',
          severity: longFunction.lines >= 250 || longFunction.branches >= 45 ? 'medium' : 'low',
          category: 'maintainability',
          filePath: file.path,
          startLine: longFunction.startLine,
          evidence: [`函数约 ${longFunction.lines} 行，包含约 ${longFunction.branches} 个分支信号。`],
          recommendation: '提取命名清晰的纯函数或子组件，让每个单元只承担一种决策或展示职责。',
          sourceAnalyzer: 'maintainability',
          ruleId: 'maintainability/long-function',
          confidence: 0.86,
          tags: ['complexity', 'long-function'],
          fixComplexity: 'medium'
        }));
      }
    }
    return { analyzerId: 'maintainability', findings };
  }
};
