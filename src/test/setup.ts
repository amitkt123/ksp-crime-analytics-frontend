import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Components under test that mount a real BrowserRouter (e.g. App) call
// history.pushState/replaceState, which mutates the shared jsdom window and
// otherwise leaks the resulting URL into whichever test runs next in this file.
beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  cleanup();
});
