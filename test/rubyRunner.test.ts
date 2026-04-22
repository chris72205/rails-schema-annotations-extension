import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RubyRunner } from '../src/rubyRunner';
import type { ExtensionConfig } from '../src/types';

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

describe('RubyRunner', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruby-runner-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('findRubyBin (via output channel logging)', () => {
    it('finds an rbenv ruby when .ruby-version matches an installed version', () => {
      const home = os.homedir();
      const version = '9.9.9-test';
      const rubyPath = path.join(home, '.rbenv', 'versions', version, 'bin', 'ruby');
      fs.mkdirSync(path.dirname(rubyPath), { recursive: true });
      fs.writeFileSync(rubyPath, '');

      fs.writeFileSync(path.join(tmpDir, '.ruby-version'), version);

      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);

      runner.generateAnnotations({ ...defaultConfig }).catch(() => {});
      const foundLog = logged.find((l) => l.includes('Found Ruby'));
      expect(foundLog).toContain(rubyPath);

      fs.rmSync(path.join(home, '.rbenv', 'versions', version), { recursive: true, force: true });
    });

    it('falls back to system ruby when no version manager path matches', () => {
      fs.writeFileSync(path.join(tmpDir, '.ruby-version'), '0.0.0-nonexistent');
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig }).catch(() => {});
      const fallbackLog = logged.find((l) => l.includes('Falling back'));
      expect(fallbackLog).toBeDefined();
    });
  });

  describe('buildArgs', () => {
    it('produces no extra flags with default config (indexes on, fk on)', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).not.toContain('--no-indexes');
      expect(cmdLog).toContain('--show-foreign-keys');
      expect(cmdLog).toContain('--show-check-constraints');
      expect(cmdLog).toContain('--show-virtual-columns');
    });

    it('adds --no-indexes when showIndexes is false', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, showIndexes: false }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--no-indexes');
    });

    it('adds --show-complete-foreign-keys when enabled', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, showCompleteForeignKeys: true }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--show-complete-foreign-keys');
    });

    it('adds --ignore-columns with the pattern', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, ignoreColumns: '^encrypted_' }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--ignore-columns=^encrypted_');
    });

    it('adds --classified-sort when enabled', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, classifiedSort: true }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--classified-sort');
    });

    it('adds --sort when enabled', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, sort: true }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--sort');
    });

    it('adds --simple-indexes when enabled', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, simpleIndexes: true }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--simple-indexes');
    });

    it('adds --format-markdown when enabled', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, formatMarkdown: true }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--format-markdown');
    });

    it('adds --format-rdoc when enabled', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, formatRdoc: true }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--format-rdoc');
    });

    it('adds --format-yard when enabled', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, formatYard: true }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--format-yard');
    });

    it('adds --with-comment when enabled', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, withComment: true }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).toContain('--with-comment');
    });

    it('does not add --ignore-columns when ignoreColumns is empty', () => {
      const logged: string[] = [];
      const runner = new RubyRunner(tmpDir, tmpDir, { appendLine: (l: string) => logged.push(l) } as any);
      runner.generateAnnotations({ ...defaultConfig, ignoreColumns: '' }).catch(() => {});
      const cmdLog = logged.find((l) => l.includes('Running:'))!;
      expect(cmdLog).not.toContain('--ignore-columns');
    });
  });
});
