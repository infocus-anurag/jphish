import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      // Only the surfaces that have real backing tests today. Other modules
      // (mocked screens, UI primitives, app shell) ship as seed-data demos
      // and will be brought under coverage as they get wired to the API.
      include: [
        'src/lib/rbac.ts',
        'src/lib/api-client.ts',
        'src/lib/auth-api.ts',
        'src/store/auth.store.ts',
        'src/components/shell/AuthGate.tsx',
        'src/components/shell/RouteGuard.tsx',
        'app/login/page.tsx',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
