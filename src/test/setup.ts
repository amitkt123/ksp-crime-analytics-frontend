import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// jsdom has no ResizeObserver -- Recharts' ResponsiveContainer (first used in
// SparklineStrip) needs one to exist globally, or every chart-containing component
// test throws "ResizeObserver is not defined".
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// Components under test that mount a real BrowserRouter (e.g. App) call
// history.pushState/replaceState, which mutates the shared jsdom window and
// otherwise leaks the resulting URL into whichever test runs next in this file.
beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  cleanup();
});
