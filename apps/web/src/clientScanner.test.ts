import { describe, expect, it } from 'vitest';
import { scanBrowserProject } from './clientScanner.js';

function projectFile(path: string, content: string): File {
  const file = new File([content], path.split('/').at(-1) ?? 'file.txt', { type: 'text/plain' });
  Object.defineProperty(file, 'webkitRelativePath', {
    value: `CodeDoctor-Test-Project/${path}`
  });
  return file;
}

function rootedFile(root: string, path: string, content: string, type = 'text/plain'): File {
  const file = new File([content], path.split('/').at(-1) ?? 'file.txt', { type });
  Object.defineProperty(file, 'webkitRelativePath', {
    value: `${root}/${path}`
  });
  return file;
}

function looseFile(path: string, content: string): File {
  return new File([content], path, { type: 'text/plain' });
}

describe('scanBrowserProject', () => {
  it('scans an uploaded project folder and returns a CodeDoctor report', async () => {
    const report = await scanBrowserProject([
      projectFile('package.json', JSON.stringify({
        scripts: { start: 'node server.js', dev: 'vite' },
        dependencies: { react: '^19.0.0', vite: '^6.0.0' }
      })),
      projectFile('vite.config.ts', 'export default {}'),
      projectFile('tsconfig.json', '{}'),
      projectFile('src/App.tsx', 'const mockData = []; try { run(); } catch (error) {} // TODO fix placeholder'),
      projectFile('src/api.ts', 'const API_BASE_URL = "http://localhost:3000/api"; const API_KEY = "test-api-key";'),
      projectFile('.codedoctor/report.md', 'TODO placeholder http://localhost:3000')
    ]);

    expect(report.context.rootPath).toBe('CodeDoctor-Test-Project');
    expect(report.context.detectedTypes).toContain('node-web');
    expect(report.summary.findingCount).toBeGreaterThanOrEqual(6);
    expect(report.findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      'node/script-target-missing',
      'secret/api-key',
      'ai-smell/empty-catch',
      'ai-smell/hardcoded-localhost',
      'test/no-test-signal'
    ]));
    expect(report.findings.some((finding) => finding.filePath?.startsWith('.codedoctor/'))).toBe(false);
  });

  it('enables stack-aware browser checks for Python, Java, and C/C++ projects', async () => {
    const report = await scanBrowserProject([
      projectFile('pyproject.toml', '[project]\nname = "api"'),
      projectFile('src/app.py', 'try:\n    run()\nexcept Exception:\n    pass\n'),
      projectFile('build.gradle', 'plugins { id "java" }'),
      projectFile('src/main/java/App.java', 'class App { void run() { try { work(); } catch (Exception e) {} } }'),
      projectFile('CMakeLists.txt', 'project(native)'),
      projectFile('src/main.cpp', '#include <cstdio>\nint main(){ char b[8]; gets(b); }\n')
    ]);

    expect(report.context.detectedTypes).toEqual(expect.arrayContaining(['python', 'java', 'cpp']));
    expect(report.score.coverage.enabledAnalyzers).toEqual(expect.arrayContaining(['python-project', 'java-project', 'cpp-project']));
    expect(report.findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      'python/broad-except',
      'java/empty-catch',
      'cpp/unsafe-c-api'
    ]));
  });

  it('reports repository health issues in uploaded source packages', async () => {
    const report = await scanBrowserProject([
      projectFile('package.json', JSON.stringify({ scripts: { start: 'node server.js' } })),
      projectFile('server.js', 'console.log("ok");'),
      projectFile('.env', 'TOKEN=secret'),
      projectFile('.DS_Store', 'metadata'),
      projectFile('vendor/node_modules/.package-lock.json', '{}')
    ]);

    expect(report.score.coverage.enabledAnalyzers).toContain('repository-health');
    expect(report.context.files.ignoredDirectories).toContain('vendor/node_modules');
    expect(report.findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      'repo/env-file-committed',
      'repo/ds-store-committed',
      'repo/node-modules-present',
      'repo/code-of-conduct-missing',
      'repo/issue-template-missing',
      'repo/pr-template-missing',
      'repo/changelog-missing',
      'repo/dependency-updates-missing'
    ]));
  });

  it('recognizes mature GitHub repository signals in browser imports', async () => {
    const report = await scanBrowserProject([
      projectFile('README.md', '# Tool'),
      projectFile('LICENSE', 'MIT'),
      projectFile('CONTRIBUTING.md', '# Contributing'),
      projectFile('SECURITY.md', '# Security'),
      projectFile('CODE_OF_CONDUCT.md', '# Conduct'),
      projectFile('CHANGELOG.md', '# Changelog'),
      projectFile('.github/ISSUE_TEMPLATE/bug.yml', 'name: Bug\ndescription: Bug report\nbody: []'),
      projectFile('.github/pull_request_template.md', '# Verification'),
      projectFile('.github/dependabot.yml', 'version: 2\nupdates: []'),
      projectFile('.github/workflows/ci.yml', 'name: CI'),
      projectFile('src/index.ts', 'export const ready = true;')
    ]);

    const missing = report.findings.map((finding) => finding.ruleId).filter((id) => id.startsWith('repo/') && id.endsWith('-missing'));
    expect(missing).toEqual([]);
    expect(report.maturity?.checks.filter((check) => !check.passed)).toEqual(expect.not.arrayContaining([
      expect.objectContaining({ id: 'code-of-conduct' }),
      expect.objectContaining({ id: 'issue-template' }),
      expect.objectContaining({ id: 'pr-template' }),
      expect.objectContaining({ id: 'changelog' }),
      expect.objectContaining({ id: 'dependency-automation' })
    ]));
  });

  it('uses .codedoctorignore and scope classification to avoid noisy fixture findings', async () => {
    const report = await scanBrowserProject([
      projectFile('.codedoctorignore', 'fixtures/\ndist/\n'),
      projectFile('package.json', JSON.stringify({ scripts: { dev: 'vite', test: 'vitest' } })),
      projectFile('README.md', '# Safe project'),
      projectFile('.gitignore', 'node_modules'),
      projectFile('pnpm-lock.yaml', 'lockfileVersion: 9.0'),
      projectFile('.env.example', 'API_KEY='),
      projectFile('src/config.ts', 'export const API_KEY = process.env.API_KEY;'),
      projectFile('fixtures/bad.ts', 'const API_KEY = "test-api-key"; try { run(); } catch (e) {}'),
      projectFile('dist/bundle.js', 'const mockData = []; try { run(); } catch (e) {}'),
      projectFile('docs/rules.md', 'Examples mention TODO, placeholder, mockData and http://localhost:3000.')
    ]);

    expect(report.findings.map((finding) => finding.filePath)).not.toEqual(expect.arrayContaining([
      'fixtures/bad.ts',
      'dist/bundle.js',
      'docs/rules.md'
    ]));
    expect(report.findings.map((finding) => finding.ruleId)).not.toEqual(expect.arrayContaining([
      'secret/openai-like-key',
      'ai-smell/empty-catch',
      'ai-smell/mock-data',
      'ai-smell/hardcoded-localhost'
    ]));
  });

  it('does not confuse analyzer vocabulary with unfinished implementation', async () => {
    const report = await scanBrowserProject([
      projectFile('package.json', JSON.stringify({ scripts: { test: 'vitest' } })),
      projectFile('src/rules.ts', `
        export const marker = /\\b(TODO|FIXME|HACK)\\b/i;
        export const mockRule = /\\b(mockData|fakeData|dummyData)\\b/;
        export const messages = { description: 'placeholder, stub, not implemented and mockData' };
      `)
    ]);

    const rules = report.findings.filter((finding) => finding.filePath === 'src/rules.ts').map((finding) => finding.ruleId);
    expect(rules).not.toEqual(expect.arrayContaining([
      'universal/dev-marker',
      'ai-smell/placeholder',
      'ai-smell/mock-data'
    ]));
  });

  it('reports mixed root imports instead of pretending they are one project', async () => {
    const report = await scanBrowserProject([
      rootedFile('NodeProject', 'package.json', JSON.stringify({ scripts: { start: 'node server.js' } })),
      rootedFile('PythonProject', 'pyproject.toml', '[project]\nname = "api"')
    ]);

    expect(report.context.rootPath).toBe('multiple-projects');
    expect(report.findings.map((finding) => finding.ruleId)).toContain('import/multiple-roots');
    expect(report.score.eligibility?.status).toBe('limited');
    expect(report.score.overallScore).toBeGreaterThan(0);
  });

  it('does not mistake missing webkitRelativePath metadata for multiple projects', async () => {
    const report = await scanBrowserProject([
      looseFile('package.json', JSON.stringify({ scripts: { test: 'vitest' } })),
      looseFile('src/index.ts', 'export const value = 1;'),
      looseFile('README.md', '# Tool')
    ]);
    expect(report.context.rootPath).toBe('browser-project');
    expect(report.findings.map((finding) => finding.ruleId)).not.toContain('import/multiple-roots');
    expect(report.score.eligibility?.status).not.toBe('ineligible');
    expect(report.score.overallScore).toBeGreaterThan(0);
  });

  it('reports archive-only imports as unsupported input', async () => {
    const report = await scanBrowserProject([
      rootedFile('ArchiveOnly', 'source.zip', 'PK\u0003\u0004', 'application/zip')
    ]);

    expect(report.findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      'import/no-scannable-files',
      'import/archive-not-expanded'
    ]));
  });

  it('reports binary-only folders as not enough source evidence', async () => {
    const report = await scanBrowserProject([
      rootedFile('AssetsOnly', 'images/cover.png', 'not really png', 'image/png')
    ]);

    expect(report.findings.map((finding) => finding.ruleId)).toContain('import/no-readable-source');
  });

  it('reports scan progress and oversized production source files', async () => {
    const progress: number[] = [];
    const report = await scanBrowserProject([
      projectFile('README.md', '# Large project'),
      projectFile('.gitignore', 'dist'),
      projectFile('src/large.ts', Array.from({ length: 620 }, (_, index) => `export const value${index} = ${index};`).join('\n')),
      projectFile('src/large.test.ts', Array.from({ length: 620 }, (_, index) => `test('${index}', () => {});`).join('\n'))
    ], { onProgress: (value) => progress.push(value.percent) });

    expect(progress.at(-1)).toBe(100);
    expect(report.findings.map((finding) => finding.ruleId)).toContain('maintainability/oversized-source-file');
    expect(report.findings.filter((finding) => finding.ruleId === 'maintainability/oversized-source-file').map((finding) => finding.filePath)).toEqual(['src/large.ts']);
  });

  it('profiles a Python automation project and includes weighted score composition', async () => {
    const report = await scanBrowserProject([
      projectFile('pyproject.toml', '[project]\nname = "sync"'),
      projectFile('scripts/sync.py', 'print("sync")'),
      projectFile('tests/test_sync.py', 'def test_sync(): assert True')
    ]);

    expect(report.score.profile?.primaryPurpose).toBe('automation-script');
    expect(report.score.eligibility?.status).toBe('eligible');
    expect(report.score.scores.projectHygiene.weight).toBe(15);
    expect(report.score.scores.aiCodingRisk.weight).toBe(5);
    expect(Object.values(report.score.scores).reduce((sum, item) => sum + (item.weight ?? 0), 0)).toBe(100);
  });

  it('recognizes Unity and Unreal inputs but refuses to score them', async () => {
    const unity = await scanBrowserProject([
      projectFile('Assets/Game.cs', 'class Game {}'),
      projectFile('ProjectSettings/ProjectVersion.txt', 'm_EditorVersion: 2022.3')
    ]);
    const unreal = await scanBrowserProject([
      projectFile('Game.uproject', '{}'),
      projectFile('Source/Game.cpp', 'int main() {}')
    ]);

    expect(unity.score.profile?.primaryPurpose).toBe('unity-project');
    expect(unity.score.eligibility?.status).toBe('ineligible');
    expect(unreal.score.profile?.primaryPurpose).toBe('unreal-project');
    expect(unreal.score.eligibility?.status).toBe('ineligible');
  });

  it('scores Go, Rust, and .NET projects as supported source inputs', async () => {
    const go = await scanBrowserProject([projectFile('go.mod', 'module example.com/tool'), projectFile('cmd/tool/main.go', 'package main')]);
    const rust = await scanBrowserProject([projectFile('Cargo.toml', '[package]\nname="tool"'), projectFile('src/main.rs', 'fn main() {}')]);
    const dotnet = await scanBrowserProject([projectFile('Tool.csproj', '<Project />'), projectFile('Program.cs', 'class Program {}')]);
    expect(go.context.detectedTypes).toContain('go');
    expect(rust.context.detectedTypes).toContain('rust');
    expect(dotnet.context.detectedTypes).toContain('dotnet');
    expect([go, rust, dotnet].every((report) => report.score.eligibility?.status !== 'ineligible')).toBe(true);
  });
});
