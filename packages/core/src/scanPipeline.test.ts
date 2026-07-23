import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanProject } from './index.js';

describe('scanProject', () => {
  it('runs matching analyzers and normalizes findings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codedoctor-pipeline-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ scripts: { start: 'node missing.js' } }));
    await writeFile(join(root, 'src/api.ts'), 'try { await fetch("http://localhost:3000"); } catch (e) {}');

    const result = await scanProject({ rootPath: root });

    expect(result.context.detectedTypes).toContain('node-web');
    expect(result.analyzerResults.map((item) => item.analyzerId)).toEqual(
      expect.arrayContaining(['universal', 'secret', 'node-dependency', 'test', 'ai-coding-smell'])
    );
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(['node/script-target-missing', 'ai-smell/empty-catch'])
    );
  });
});
