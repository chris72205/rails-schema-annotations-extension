import * as cp from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RubyRunner } from '../src/rubyRunner';
import type { ExtensionConfig } from '../src/types';

vi.mock('child_process');

const defaultConfig: ExtensionConfig = {
  enabled: true,
  showIndexes: true,
  showForeignKeys: true,
  showCompleteForeignKeys: false,
  showCheckConstraints: true,
  showVirtualColumns: true,
  ignoreColumns: '',
  classifiedSort: false,
  sort: false,
  simpleIndexes: false,
  formatMarkdown: false,
  formatRdoc: false,
  formatYard: false,
  withComment: false,
};

const nullOutputChannel = { appendLine: () => {} } as any;

function stubExec(error: Error | null, stdout: string, stderr: string) {
  vi.mocked(cp.exec).mockImplementation((_cmd: any, _opts: any, cb: any) => {
    cb(error, stdout, stderr);
    return {} as any;
  });
}

describe('RubyRunner exec callback', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruby-runner-exec-test-'));
    vi.mocked(cp.execSync).mockReturnValue('' as any);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('resolves with parsed JSON on success', async () => {
    const payload = { 'app/models/user.rb': '# annotation' };
    stubExec(null, JSON.stringify(payload), '');
    const result = await new RubyRunner(tmpDir, tmpDir, nullOutputChannel).generateAnnotations({ ...defaultConfig });
    expect(result).toEqual(payload);
  });

  it('resolves with {} when stdout is empty', async () => {
    stubExec(null, '', '');
    const result = await new RubyRunner(tmpDir, tmpDir, nullOutputChannel).generateAnnotations({ ...defaultConfig });
    expect(result).toEqual({});
  });

  it('resolves with {} when stdout is whitespace only', async () => {
    stubExec(null, '   \n', '');
    const result = await new RubyRunner(tmpDir, tmpDir, nullOutputChannel).generateAnnotations({ ...defaultConfig });
    expect(result).toEqual({});
  });

  it('resolves with {} and logs when JSON is invalid', async () => {
    const logged: string[] = [];
    const channel = { appendLine: (l: string) => logged.push(l) } as any;
    stubExec(null, 'not-json', '');
    const result = await new RubyRunner(tmpDir, tmpDir, channel).generateAnnotations({ ...defaultConfig });
    expect(result).toEqual({});
    expect(logged.some((l) => l.includes('Failed to parse JSON'))).toBe(true);
  });

  it('resolves with {} when stdout is a non-object JSON value', async () => {
    stubExec(null, '"just a string"', '');
    const result = await new RubyRunner(tmpDir, tmpDir, nullOutputChannel).generateAnnotations({ ...defaultConfig });
    expect(result).toEqual({});
  });

  it('resolves with {} and logs when exec errors', async () => {
    const logged: string[] = [];
    const channel = { appendLine: (l: string) => logged.push(l) } as any;
    stubExec(new Error('exit 1'), '', '');
    const result = await new RubyRunner(tmpDir, tmpDir, channel).generateAnnotations({ ...defaultConfig });
    expect(result).toEqual({});
    expect(logged.some((l) => l.includes('[error]'))).toBe(true);
  });

  it('logs stderr when present alongside a successful response', async () => {
    const logged: string[] = [];
    const channel = { appendLine: (l: string) => logged.push(l) } as any;
    stubExec(null, '{}', 'some warning from bundler');
    await new RubyRunner(tmpDir, tmpDir, channel).generateAnnotations({ ...defaultConfig });
    expect(logged.some((l) => l.includes('[stderr]'))).toBe(true);
  });

  it('logs the number of models in a successful response', async () => {
    const logged: string[] = [];
    const channel = { appendLine: (l: string) => logged.push(l) } as any;
    const payload = { 'app/models/user.rb': '# a', 'app/models/post.rb': '# b' };
    stubExec(null, JSON.stringify(payload), '');
    await new RubyRunner(tmpDir, tmpDir, channel).generateAnnotations({ ...defaultConfig });
    expect(logged.some((l) => l.includes('2 model(s)'))).toBe(true);
  });
});
