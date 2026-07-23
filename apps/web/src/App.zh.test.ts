import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Chinese UI copy', () => {
  it('uses Chinese labels for the report viewer shell', async () => {
    const source = (await Promise.all([
      './App.tsx',
      './demoReport.ts',
      './projectInsights.ts',
      './useReportWorkspace.ts',
      './useAiWorkspace.ts',
      './aiProviders.ts',
      './components/CommandBar.tsx',
      './components/NavigationRail.tsx',
      './components/OverviewView.tsx',
      './components/IssuesView.tsx',
      './components/AiView.tsx',
      './components/ReportsView.tsx'
    ].map((path) => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');

    expect(source).toContain('CodeDoctor 工程诊断工作台');
    expect(source).toContain('导入项目');
    expect(source).toContain('导入报告');
    expect(source).toContain('模型连接');
    expect(source).toContain('OpenAI GPT');
    expect(source).toContain('阿里云千问');
    expect(source).toContain('解释下一个高危');
    expect(source).toContain('去 AI 分析这个问题');
    expect(source).toContain('建议先做');
    expect(source).toContain('项目画像');
    expect(source).toContain('关键证据');
    expect(source).toContain('项目成熟度明细');
    expect(source).toContain('问题队列');
    expect(source).toContain('当前问题');
    expect(source).toContain('收纳区');
    expect(source).toContain('AI 修复提示词');
    expect(source).toContain('复制提示词');
    expect(source).toContain('Markdown 预览');
  });
});
