import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      exclude: [
        'test/**',
        'src/extension.ts',
        'src/annotationController.ts',
        'src/decorationProvider.ts',
        'src/annotationPanel.ts',
        'src/hoverProvider.ts',
      ],
    },
  },
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, 'test/support/vscode.mock.ts'),
    },
  },
});
