import { describe, expect, it } from 'vitest';
import type { ProjectContext, ProjectFile } from '@codedoctor/shared';
import { profileProject } from './projectProfile.js';

function context(paths: string[], overrides: Partial<ProjectContext> = {}): ProjectContext {
  const files: ProjectFile[] = paths.map((path) => ({ path, absolutePath: path, size: 100, role: 'production' }));
  return {
    rootPath: '/project', detectedTypes: ['generic'], languages: ['unknown'], frameworks: ['unknown'],
    packageManagers: ['unknown'], confidence: 0.7, evidence: [], recommendedAnalyzers: [], unsupportedAreas: [],
    files: { files, byPath: Object.fromEntries(files.map((file) => [file.path, file])) }, ...overrides
  };
}

describe('profileProject', () => {
  it('recognizes supported CLI, script, library, and monorepo purposes', () => {
    expect(profileProject(context(['package.json', 'src/cli.ts'], { detectedTypes: ['generic', 'node-web'], languages: ['typescript'] })).primaryPurpose).toBe('cli');
    expect(profileProject(context(['pyproject.toml', 'scripts/sync.py'], { detectedTypes: ['generic', 'python'], languages: ['python'] })).primaryPurpose).toBe('automation-script');
    expect(profileProject(context(['CMakeLists.txt', 'include/tool.hpp', 'src/tool.cpp'], { detectedTypes: ['generic', 'cpp'], languages: ['cpp'] })).primaryPurpose).toBe('library-sdk');
    expect(profileProject(context(['pnpm-workspace.yaml', 'packages/a/package.json', 'packages/b/package.json'], { detectedTypes: ['generic', 'node-web'], languages: ['typescript'] })).primaryPurpose).toBe('monorepo');
  });

  it('refuses Unity and Unreal scoring instead of returning a misleading score', () => {
    const unity = profileProject(context(['Assets/Game.cs', 'ProjectSettings/ProjectVersion.txt'], { detectedTypes: ['generic', 'unity'], languages: ['csharp'], frameworks: ['unity'] }));
    const unreal = profileProject(context(['Game.uproject', 'Source/Game.cpp'], { detectedTypes: ['generic', 'unreal'], languages: ['cpp'], frameworks: ['unreal'] }));
    expect(unity.eligibility.status).toBe('ineligible');
    expect(unreal.eligibility.status).toBe('ineligible');
    expect(unity.eligibility.reasons.join(' ')).toContain('Unity');
    expect(unreal.eligibility.reasons.join(' ')).toContain('Unreal');
  });

  it('marks unknown source projects as limited and binary-only input as ineligible', () => {
    expect(profileProject(context(['src/tool.xyz'])) .eligibility.status).toBe('limited');
    expect(profileProject(context(['assets/logo.png'], { languages: ['unknown'] })).eligibility.status).toBe('ineligible');
  });
});
