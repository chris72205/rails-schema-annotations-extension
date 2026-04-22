import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnnotationCache } from '../src/annotationCache';

function makeContext(storageDir: string) {
  return { globalStorageUri: { fsPath: storageDir } } as any;
}

describe('AnnotationCache', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'annotation-cache-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('computeFileSha', () => {
    it('returns undefined for a nonexistent file', () => {
      expect(AnnotationCache.computeFileSha('/does/not/exist.rb')).toBeUndefined();
    });

    it('returns a hex SHA256 string for an existing file', () => {
      const file = path.join(tmpDir, 'schema.rb');
      fs.writeFileSync(file, 'content');
      const sha = AnnotationCache.computeFileSha(file);
      expect(sha).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns the same SHA for identical content', () => {
      const a = path.join(tmpDir, 'a.rb');
      const b = path.join(tmpDir, 'b.rb');
      fs.writeFileSync(a, 'same content');
      fs.writeFileSync(b, 'same content');
      expect(AnnotationCache.computeFileSha(a)).toBe(AnnotationCache.computeFileSha(b));
    });

    it('returns different SHAs for different content', () => {
      const a = path.join(tmpDir, 'a.rb');
      const b = path.join(tmpDir, 'b.rb');
      fs.writeFileSync(a, 'content A');
      fs.writeFileSync(b, 'content B');
      expect(AnnotationCache.computeFileSha(a)).not.toBe(AnnotationCache.computeFileSha(b));
    });
  });

  describe('get / set', () => {
    it('returns undefined for an unknown key', () => {
      const cache = new AnnotationCache(makeContext(tmpDir));
      expect(cache.get('unknown-key')).toBeUndefined();
    });

    it('returns annotations after set', () => {
      const cache = new AnnotationCache(makeContext(tmpDir));
      const annotations = { 'app/models/user.rb': '# == Schema Information\n' };
      cache.set('key1', annotations);
      expect(cache.get('key1')).toEqual(annotations);
    });

    it('overwrites an existing entry for the same key', () => {
      const cache = new AnnotationCache(makeContext(tmpDir));
      cache.set('key1', { 'app/models/user.rb': 'old' });
      cache.set('key1', { 'app/models/user.rb': 'new' });
      expect(cache.get('key1')!['app/models/user.rb']).toBe('new');
    });

    it('stores multiple keys independently', () => {
      const cache = new AnnotationCache(makeContext(tmpDir));
      cache.set('key1', { 'app/models/user.rb': 'annotation-1' });
      cache.set('key2', { 'app/models/post.rb': 'annotation-2' });
      expect(cache.get('key1')).toEqual({ 'app/models/user.rb': 'annotation-1' });
      expect(cache.get('key2')).toEqual({ 'app/models/post.rb': 'annotation-2' });
    });

    it('evicts the oldest entry when MAX_ENTRIES is exceeded', () => {
      const cache = new AnnotationCache(makeContext(tmpDir));
      for (let i = 0; i < 21; i++) {
        cache.set(`key-${i}`, { [`app/models/model${i}.rb`]: `annotation-${i}` });
      }
      expect(cache.get('key-0')).toBeUndefined();
      expect(cache.get('key-20')).toBeDefined();
    });
  });

  describe('persistence', () => {
    it('load is a no-op when the cache file does not exist', () => {
      const cache = new AnnotationCache(makeContext(tmpDir));
      expect(() => cache.load()).not.toThrow();
      expect(cache.get('anything')).toBeUndefined();
    });

    it('persists entries to disk on set and restores them on load', () => {
      const annotations = { 'app/models/user.rb': '# annotation' };
      const cache1 = new AnnotationCache(makeContext(tmpDir));
      cache1.set('my-key', annotations);

      const cache2 = new AnnotationCache(makeContext(tmpDir));
      cache2.load();
      expect(cache2.get('my-key')).toEqual(annotations);
    });

    it('starts fresh when the cache file contains corrupt JSON', () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'schema-annotations-cache.json'), 'not-valid-json');
      const cache = new AnnotationCache(makeContext(tmpDir));
      cache.load();
      expect(cache.get('anything')).toBeUndefined();
    });

    it('ignores cache files with an unrecognised version', () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'schema-annotations-cache.json'),
        JSON.stringify({ version: 99, entries: [{ key: 'k', annotations: {}, savedAt: 0 }] })
      );
      const cache = new AnnotationCache(makeContext(tmpDir));
      cache.load();
      expect(cache.get('k')).toBeUndefined();
    });
  });
});
