import "@testing-library/jest-dom";

// Radix components (Checkbox, Select…) use ResizeObserver — jsdom has none.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
