import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectProject } from './index.js';

async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'codedoctor-detector-'));
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe('detectProject', () => {
  it('detects a Vite React TypeScript project', async () => {
    const root = await fixture({
      'package.json': JSON.stringify({
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { react: '^19.0.0', vite: '^6.0.0' },
        devDependencies: { typescript: '^5.0.0' }
      }),
      'pnpm-lock.yaml': 'lockfileVersion: 9.0',
      'vite.config.ts': 'import react from "@vitejs/plugin-react"',
      'tsconfig.json': '{}',
      'src/App.tsx': 'export function App() { return <div />; }'
    });

    const context = await detectProject(root);

    expect(context.detectedTypes).toContain('node-web');
    expect(context.languages).toContain('typescript');
    expect(context.frameworks).toEqual(expect.arrayContaining(['react', 'vite']));
    expect(context.packageManagers).toContain('pnpm');
    expect(context.recommendedAnalyzers).toEqual(expect.arrayContaining(['universal', 'secret', 'node-dependency']));
    expect(context.confidence).toBeGreaterThan(0.75);
  });

  it('detects a Unity project without claiming deep support', async () => {
    const root = await fixture({
      'Assets/Scenes/Main.unity': '%YAML 1.1',
      'ProjectSettings/ProjectVersion.txt': 'm_EditorVersion: 2022.3',
      'Packages/manifest.json': '{"dependencies":{}}',
      'Assets/Scripts/Player.cs': 'public class Player {}'
    });

    const context = await detectProject(root);

    expect(context.detectedTypes).toContain('unity');
    expect(context.languages).toContain('csharp');
    expect(context.frameworks).toContain('unity');
    expect(context.recommendedAnalyzers).toContain('unity');
    expect(context.unsupportedAreas.some((area) => area.area.includes('Unity deep'))).toBe(true);
  });

  it('detects Python, Java, and C/C++ projects with dedicated analyzers', async () => {
    const pythonRoot = await fixture({
      'pyproject.toml': '[project]\nname = "api"',
      'src/app.py': 'print("hello")'
    });
    const javaRoot = await fixture({
      'pom.xml': '<project />',
      'src/main/java/App.java': 'class App {}'
    });
    const cppRoot = await fixture({
      'CMakeLists.txt': 'project(native)',
      'src/main.cpp': 'int main() { return 0; }'
    });

    const python = await detectProject(pythonRoot);
    const java = await detectProject(javaRoot);
    const cpp = await detectProject(cppRoot);

    expect(python.detectedTypes).toContain('python');
    expect(python.recommendedAnalyzers).toContain('python-project');
    expect(java.detectedTypes).toContain('java');
    expect(java.recommendedAnalyzers).toContain('java-project');
    expect(cpp.detectedTypes).toContain('cpp');
    expect(cpp.languages).toContain('cpp');
    expect(cpp.recommendedAnalyzers).toContain('cpp-project');
  });

  it('falls back to a generic project', async () => {
    const root = await fixture({
      'README.md': '# Example',
      '.gitignore': 'node_modules',
      'scripts/run.sh': 'echo hello'
    });

    const context = await detectProject(root);

    expect(context.detectedTypes).toContain('generic');
    expect(context.recommendedAnalyzers).toEqual(expect.arrayContaining(['universal', 'secret', 'test', 'ai-coding-smell']));
  });

  it('recognizes Go, Rust, and .NET source projects without claiming runtime verification', async () => {
    const go = await detectProject(await fixture({ 'go.mod': 'module example.com/tool', 'cmd/tool/main.go': 'package main' }));
    const rust = await detectProject(await fixture({ 'Cargo.toml': '[package]\nname="tool"', 'src/main.rs': 'fn main() {}' }));
    const dotnet = await detectProject(await fixture({ 'Tool.csproj': '<Project Sdk="Microsoft.NET.Sdk" />', 'Program.cs': 'class Program {}' }));
    expect(go.detectedTypes).toContain('go');
    expect(go.languages).toContain('go');
    expect(rust.detectedTypes).toContain('rust');
    expect(rust.languages).toContain('rust');
    expect(dotnet.detectedTypes).toContain('dotnet');
    expect(dotnet.languages).toContain('csharp');
  });

  it('records ignored dependency directories without indexing their contents', async () => {
    const root = await fixture({
      'package.json': '{}',
      'node_modules/pkg/index.js': 'module.exports = {}'
    });

    const context = await detectProject(root);

    expect(context.files.ignoredDirectories).toContain('node_modules');
    expect(context.files.byPath['node_modules/pkg/index.js']).toBeUndefined();
  });

  it('honors .codedoctorignore for generated and fixture paths', async () => {
    const root = await fixture({
      '.codedoctorignore': 'work/\n**/dist-ts/\n**/*.test.ts\nexamples/',
      'package.json': '{}',
      'src/index.ts': 'export const ok = true;',
      'src/index.test.ts': 'const fixtureSecret = "test-fixture-token";',
      'apps/web/dist-ts/index.js': 'console.log("generated");',
      'work/ui-concepts/concept.svg': '<svg />',
      'examples/bad/src/api.ts': 'try { run(); } catch (error) {}'
    });

    const context = await detectProject(root);

    expect(context.files.byPath['src/index.ts']).toBeDefined();
    expect(context.files.byPath['src/index.test.ts']).toBeUndefined();
    expect(context.files.byPath['apps/web/dist-ts/index.js']).toBeUndefined();
    expect(context.files.byPath['work/ui-concepts/concept.svg']).toBeUndefined();
    expect(context.files.byPath['examples/bad/src/api.ts']).toBeUndefined();
    expect(context.files.ignoredDirectories).toEqual(expect.arrayContaining(['work', 'examples']));
  });
});
