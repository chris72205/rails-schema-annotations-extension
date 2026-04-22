export interface ExtensionConfig {
  enabled: boolean;
  showIndexes: boolean;
  showForeignKeys: boolean;
  showCompleteForeignKeys: boolean;
  showCheckConstraints: boolean;
  showVirtualColumns: boolean;
  ignoreColumns: string;
  classifiedSort: boolean;
  sort: boolean;
  simpleIndexes: boolean;
  formatMarkdown: boolean;
  formatRdoc: boolean;
  formatYard: boolean;
  withComment: boolean;
}
