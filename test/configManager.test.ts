import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigManager } from '../src/configManager';

describe('ConfigManager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-manager-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('getConfig defaults', () => {
    it('returns sensible defaults when no .annotaterb file exists', () => {
      const config = new ConfigManager(tmpDir).getConfig();
      expect(config.enabled).toBe(true);
      expect(config.showIndexes).toBe(true);
      expect(config.showForeignKeys).toBe(true);
      expect(config.showCompleteForeignKeys).toBe(false);
      expect(config.showCheckConstraints).toBe(true);
      expect(config.showVirtualColumns).toBe(true);
      expect(config.ignoreColumns).toBe('');
      expect(config.classifiedSort).toBe(false);
      expect(config.sort).toBe(false);
      expect(config.simpleIndexes).toBe(false);
      expect(config.formatMarkdown).toBe(false);
      expect(config.formatRdoc).toBe(false);
      expect(config.formatYard).toBe(false);
      expect(config.withComment).toBe(false);
    });
  });

  describe('.annotaterb overrides', () => {
    it('overrides boolean options set to true', () => {
      fs.writeFileSync(path.join(tmpDir, '.annotaterb'), [
        'show_complete_foreign_keys: true',
        'classified_sort: true',
        'with_comment: true',
      ].join('\n'));
      const config = new ConfigManager(tmpDir).getConfig();
      expect(config.showCompleteForeignKeys).toBe(true);
      expect(config.classifiedSort).toBe(true);
      expect(config.withComment).toBe(true);
    });

    it('overrides boolean options set to false', () => {
      fs.writeFileSync(path.join(tmpDir, '.annotaterb'), [
        'show_indexes: false',
        'show_foreign_keys: false',
        'show_check_constraints: false',
        'show_virtual_columns: false',
      ].join('\n'));
      const config = new ConfigManager(tmpDir).getConfig();
      expect(config.showIndexes).toBe(false);
      expect(config.showForeignKeys).toBe(false);
      expect(config.showCheckConstraints).toBe(false);
      expect(config.showVirtualColumns).toBe(false);
    });

    it('overrides ignoreColumns with a string value', () => {
      fs.writeFileSync(path.join(tmpDir, '.annotaterb'), 'ignore_columns: ^encrypted_');
      const config = new ConfigManager(tmpDir).getConfig();
      expect(config.ignoreColumns).toBe('^encrypted_');
    });

    it('overrides format options', () => {
      fs.writeFileSync(path.join(tmpDir, '.annotaterb'), [
        'format_markdown: true',
        'format_rdoc: false',
      ].join('\n'));
      const config = new ConfigManager(tmpDir).getConfig();
      expect(config.formatMarkdown).toBe(true);
      expect(config.formatRdoc).toBe(false);
    });

    it('leaves unspecified options at their defaults', () => {
      fs.writeFileSync(path.join(tmpDir, '.annotaterb'), 'sort: true');
      const config = new ConfigManager(tmpDir).getConfig();
      expect(config.sort).toBe(true);
      expect(config.showIndexes).toBe(true);
    });

    it('ignores an unreadable .annotaterb file gracefully', () => {
      const dotFile = path.join(tmpDir, '.annotaterb');
      fs.writeFileSync(dotFile, 'show_indexes: false');
      fs.chmodSync(dotFile, 0o000);
      expect(() => new ConfigManager(tmpDir).getConfig()).not.toThrow();
      fs.chmodSync(dotFile, 0o644);
    });
  });
});
