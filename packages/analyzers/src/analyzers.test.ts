import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ProjectContext } from '@codedoctor/shared';
import { detectProject } from '@codedoctor/detectors';
import { createDefaultAnalyzers } from './index.js';

async function fixture(files: Record<string, string>): Promise<ProjectContext> {
  const root = await mkdtemp(join(tmpdir(), 'codedoctor-analyzer-'));
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return detectProject(root);
}

describe('default analyzers', () => {
  it('detects hard-coded secrets', async () => {
    const context = await fixture({
      'README.md': '# Test',
      'src/config.ts': 'export const API_KEY = "test-api-key";',
      'src/tencent.js': 'const secretId = "test-secret-id-value";',
      'src/db.js': 'const uri = "mongodb+srv://test:test123456@cluster0.example.mongodb.net/app";'
    });
    const secret = createDefaultAnalyzers().find((analyzer) => analyzer.id === 'secret')!;

    const result = await secret.analyze(context);

    expect(result.findings.some((finding) => finding.category === 'security')).toBe(true);
    expect(result.findings[0].severity).toMatch(/high|critical/);
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      'secret/api-key',
      'secret/mongodb-uri-credentials'
    ]));
  });

  it('does not treat fixture secrets or generated files as production findings', async () => {
    const context = await fixture({
      'README.md': '# Test',
      'src/config.ts': 'export const API_KEY = process.env.API_KEY;',
      'src/config.test.ts': 'export const API_KEY = "test-api-key";',
      'fixtures/unsafe.ts': 'const secretId = "AKIDfixtureFixtureFixture"; try { run(); } catch (e) {}',
      'dist/bundle.js': 'const mockData = []; try { run(); } catch (e) {}',
      'docs/rules.md': 'The detector mentions TODO, placeholder, mockData, and localhost examples.'
    });
    const analyzers = createDefaultAnalyzers();
    const secret = analyzers.find((analyzer) => analyzer.id === 'secret')!;
    const smells = analyzers.find((analyzer) => analyzer.id === 'ai-coding-smell')!;
    const universal = analyzers.find((analyzer) => analyzer.id === 'universal')!;

    const results = [
      ...(await secret.analyze(context)).findings,
      ...(await smells.analyze(context)).findings,
      ...(await universal.analyze(context)).findings
    ];

    expect(results.map((finding) => finding.filePath)).not.toEqual(expect.arrayContaining([
      'src/config.test.ts',
      'fixtures/unsafe.ts',
      'dist/bundle.js',
      'docs/rules.md'
    ]));
  });

  it('reports oversized production source while excluding tests and generated files', async () => {
    const longProduction = Array.from({ length: 720 }, (_, index) => `export const value${index} = ${index};`).join('\n');
    const longFunction = `export function processEverything() {\n${Array.from({ length: 145 }, (_, index) => `  if (input${index}) return ${index};`).join('\n')}\n}`;
    const context = await fixture({
      'README.md': '# Test',
      '.gitignore': 'dist',
      'src/large.ts': longProduction,
      'src/complex.ts': longFunction,
      'src/large.test.ts': longProduction,
      'dist/bundle.js': longProduction
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'maintainability')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(['maintainability/oversized-source-file', 'maintainability/long-function'])
    );
    expect(result.findings.map((finding) => finding.filePath)).not.toEqual(
      expect.arrayContaining(['src/large.test.ts', 'dist/bundle.js'])
    );
  });

  it('reports repository health signals for GitHub-style project quality', async () => {
    const context = await fixture({
      'package.json': JSON.stringify({ scripts: { start: 'node server.js' } }),
      'package-lock.json': '{}',
      '.env': 'TOKEN=secret',
      '.DS_Store': 'metadata',
      'vendor/node_modules/.package-lock.json': '{}',
      'server.js': 'console.log("ok");'
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'repository-health')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      'repo/license-missing',
      'repo/security-policy-missing',
      'repo/ci-missing',
      'repo/code-of-conduct-missing',
      'repo/issue-template-missing',
      'repo/pr-template-missing',
      'repo/changelog-missing',
      'repo/dependency-updates-missing',
      'repo/env-file-committed',
      'repo/ds-store-committed',
      'repo/node-modules-present'
    ]));
  });

  it('recognizes mature GitHub repository health signals', async () => {
    const context = await fixture({
      'README.md': '# Tool',
      'LICENSE': 'MIT',
      'CONTRIBUTING.md': '# Contributing',
      'SECURITY.md': '# Security',
      'CODE_OF_CONDUCT.md': '# Conduct',
      'CHANGELOG.md': '# Changelog',
      '.github/ISSUE_TEMPLATE/bug.yml': 'name: Bug\ndescription: Bug report\nbody: []',
      '.github/pull_request_template.md': '# Verification',
      '.github/dependabot.yml': 'version: 2\nupdates: []',
      '.github/workflows/ci.yml': 'name: CI',
      'src/index.ts': 'export const ready = true;'
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'repository-health')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId).filter((id) => id.endsWith('-missing'))).toEqual([]);
  });

  it('detects package scripts that point at missing files', async () => {
    const context = await fixture({
      'package.json': JSON.stringify({ scripts: { start: 'node server.js' } })
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'node-dependency')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId)).toContain('node/script-target-missing');
  });

  it('detects empty catch blocks and localhost hard-coding as AI coding smells', async () => {
    const context = await fixture({
      'package.json': JSON.stringify({ scripts: { dev: 'vite' } }),
      'src/api.ts': 'try { await fetch("http://localhost:3000/api"); } catch (e) {}'
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'ai-coding-smell')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(['ai-smell/empty-catch', 'ai-smell/hardcoded-localhost'])
    );
  });

  it('does not treat an input placeholder attribute as unfinished implementation', async () => {
    const context = await fixture({
      'README.md': '# UI',
      'src/Search.tsx': '<input placeholder="搜索文件" />'
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'ai-coding-smell')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId)).not.toContain('ai-smell/placeholder');
  });

  it('does not report rule catalogs as the unfinished behavior they describe', async () => {
    const context = await fixture({
      'README.md': '# Rules',
      '.gitignore': 'dist/',
      'src/rules.ts': `
        export const marker = /\\b(TODO|FIXME|HACK)\\b/i;
        export const mockRule = /\\b(mockData|fakeData|dummyData)\\b/;
        export const messages = { description: 'placeholder, stub, not implemented and mockData' };
      `
    });
    const analyzers = createDefaultAnalyzers();
    const smells = analyzers.find((item) => item.id === 'ai-coding-smell')!;
    const universal = analyzers.find((item) => item.id === 'universal')!;

    const findings = [
      ...(await smells.analyze(context)).findings,
      ...(await universal.analyze(context)).findings
    ];

    expect(findings).toEqual([]);
  });

  it('reports executable placeholders, mock declarations, and comment markers', async () => {
    const context = await fixture({
      'README.md': '# Work in progress',
      'src/unfinished.ts': `
        const mockData = [];
        // TODO connect the real service
        export function load() { throw new Error('not implemented'); }
      `
    });
    const analyzers = createDefaultAnalyzers();
    const smells = analyzers.find((item) => item.id === 'ai-coding-smell')!;
    const universal = analyzers.find((item) => item.id === 'universal')!;
    const ruleIds = [
      ...(await smells.analyze(context)).findings,
      ...(await universal.analyze(context)).findings
    ].map((finding) => finding.ruleId);

    expect(ruleIds).toEqual(expect.arrayContaining([
      'ai-smell/placeholder',
      'ai-smell/mock-data',
      'universal/dev-marker'
    ]));
  });

  it('reports missing tests for a Node project', async () => {
    const context = await fixture({
      'package.json': JSON.stringify({ scripts: { dev: 'vite' } }),
      'src/App.tsx': 'export function App() { return null; }'
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'test')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId)).toContain('test/no-test-signal');
  });

  it('runs Python project checks', async () => {
    const context = await fixture({
      'pyproject.toml': '[project]\nname = "api"',
      'src/app.py': 'try:\n    run()\nexcept Exception:\n    pass\n'
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'python-project')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(['python/lockfile-missing', 'python/test-signal-missing', 'python/broad-except'])
    );
  });

  it('runs Java project checks', async () => {
    const context = await fixture({
      'build.gradle': 'plugins { id "java" }',
      'src/main/java/App.java': 'class App { void run() { try { work(); } catch (Exception e) {} System.out.println("x"); } }'
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'java-project')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(['java/gradle-wrapper-missing', 'java/test-signal-missing', 'java/empty-catch', 'java/system-out'])
    );
  });

  it('runs C/C++ project checks', async () => {
    const context = await fixture({
      'CMakeLists.txt': 'project(native)',
      'src/main.cpp': '#include <cstdio>\nint main(){ char b[8]; gets(b); }\n'
    });
    const analyzer = createDefaultAnalyzers().find((item) => item.id === 'cpp-project')!;

    const result = await analyzer.analyze(context);

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(['cpp/cmake-minimum-missing', 'cpp/clang-format-missing', 'cpp/test-signal-missing', 'cpp/unsafe-c-api'])
    );
  });
});
