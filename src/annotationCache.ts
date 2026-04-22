import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const MAX_ENTRIES = 20;
const CACHE_FILE = 'schema-annotations-cache.json';

export interface AnnotationRecord {
  [modelPath: string]: string;
}

interface CacheEntry {
  key: string;
  annotations: AnnotationRecord;
  savedAt: number;
}

interface CacheFile {
  version: 1;
  entries: CacheEntry[];
}

export class AnnotationCache {
  private entries: CacheEntry[] = [];
  private storageDir: string;

  constructor(context: vscode.ExtensionContext) {
    this.storageDir = context.globalStorageUri.fsPath;
  }

  load(): void {
    const filePath = path.join(this.storageDir, CACHE_FILE);
    try {
      if (!fs.existsSync(filePath)) return;
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw) as CacheFile;
      if (data.version === 1 && Array.isArray(data.entries)) {
        this.entries = data.entries;
      }
    } catch {
      this.entries = [];
    }
  }

  private persist(): void {
    try {
      fs.mkdirSync(this.storageDir, { recursive: true });
      const data: CacheFile = { version: 1, entries: this.entries };
      fs.writeFileSync(path.join(this.storageDir, CACHE_FILE), JSON.stringify(data), 'utf8');
    } catch {
      // Non-fatal — cache won't survive restart but operation continues
    }
  }

  get(key: string): AnnotationRecord | undefined {
    return this.entries.find((e) => e.key === key)?.annotations;
  }

  set(key: string, annotations: AnnotationRecord): void {
    this.entries = this.entries.filter((e) => e.key !== key);
    this.entries.unshift({ key, annotations, savedAt: Date.now() });
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }
    this.persist();
  }

  static computeFileSha(filePath: string): string | undefined {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return undefined;
    }
  }
}
