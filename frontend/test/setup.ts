import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

// Auto-cleanup mounted React trees between tests.
afterEach(() => cleanup());

// MSW lifecycle.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// next/navigation has hard dependencies on Next's app router internals; tests
// mock it explicitly. Provide a default mock so any import of usePathname /
// useRouter / useSearchParams doesn't blow up.
vi.mock('next/navigation', () => {
  const mockRouter = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() };
  return {
    useRouter: () => mockRouter,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    redirect: vi.fn(),
    __mockRouter: mockRouter,
  };
});

// matchMedia is absent in jsdom; provide a noop shim so theme code doesn't crash.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Sonner toasts touch the DOM; replace with quiet stubs.
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  },
  Toaster: () => null,
}));
