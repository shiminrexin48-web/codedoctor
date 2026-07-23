import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from './index.js';

describe('CLI', () => {
  it('shows help without starting a scan', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(await runCli(['--help'])).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toContain('codedoctor scan');

    log.mockRestore();
  });

  it('rejects unknown or invalid options', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await runCli(['scan', '.', '--unknown'])).toBe(1);
    expect(await runCli(['scan', '.', '--ai', 'unknown-provider'])).toBe(1);
    expect(error.mock.calls.flat().join('\n')).toContain('未知参数');

    error.mockRestore();
  });

  it('reports an inaccessible target without throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const missing = join(tmpdir(), `codedoctor-missing-${Date.now()}`);

    expect(await runCli(['scan', missing])).toBe(1);
    expect(error.mock.calls.flat().join('\n')).toContain('扫描目录不存在或无法访问');

    error.mockRestore();
  });

  it('scans a project and writes reports', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codedoctor-cli-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ scripts: { start: 'node missing.js' } }));
    await writeFile(join(root, 'src/index.ts'), 'const token = process.env.TEST_TOKEN;');

    const exitCode = await runCli(['scan', root]);

    expect(exitCode).toBe(0);
    expect(await readFile(join(root, '.codedoctor/report.json'), 'utf8')).toContain('node/script-target-missing');
    expect(await readFile(join(root, '.codedoctor/report.md'), 'utf8')).toContain('# CodeDoctor Report');
  });
});
