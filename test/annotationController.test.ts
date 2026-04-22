import { describe, expect, it } from 'vitest';
import { configFingerprint, parseTableName } from '../src/annotationController';
import type { ExtensionConfig } from '../src/types';

const baseConfig: ExtensionConfig = {
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

describe('parseTableName', () => {
  it('extracts the table name from a standard annotation', () => {
    const annotation = '# == Schema Information\n#\n# Table name: users\n';
    expect(parseTableName(annotation)).toBe('users');
  });

  it('handles extra whitespace after the colon', () => {
    expect(parseTableName('# Table name:   businesses_suggestions\n')).toBe('businesses_suggestions');
  });

  it('returns undefined when no Table name line is present', () => {
    expect(parseTableName('# == Schema Information\n')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(parseTableName('')).toBeUndefined();
  });

  it('matches on any line, not just the first', () => {
    const annotation = '# line one\n# line two\n# Table name: posts\n# line four\n';
    expect(parseTableName(annotation)).toBe('posts');
  });
});

describe('configFingerprint', () => {
  it('produces the same fingerprint for identical configs', () => {
    expect(configFingerprint(baseConfig)).toBe(configFingerprint({ ...baseConfig }));
  });

  it('produces a different fingerprint when a setting changes', () => {
    const modified = { ...baseConfig, showForeignKeys: false };
    expect(configFingerprint(baseConfig)).not.toBe(configFingerprint(modified));
  });

  it('excludes the enabled field (it does not affect annotation content)', () => {
    const enabled = { ...baseConfig, enabled: true };
    const disabled = { ...baseConfig, enabled: false };
    expect(configFingerprint(enabled)).toBe(configFingerprint(disabled));
  });

  it('produces different fingerprints for every changed option', () => {
    const changes: Partial<ExtensionConfig>[] = [
      { showIndexes: false },
      { showForeignKeys: false },
      { showCompleteForeignKeys: true },
      { showCheckConstraints: false },
      { showVirtualColumns: false },
      { ignoreColumns: '^encrypted_' },
      { classifiedSort: true },
      { sort: true },
      { simpleIndexes: true },
      { formatMarkdown: true },
      { formatRdoc: true },
      { formatYard: true },
      { withComment: true },
    ];
    const base = configFingerprint(baseConfig);
    for (const change of changes) {
      expect(configFingerprint({ ...baseConfig, ...change })).not.toBe(base);
    }
  });
});
