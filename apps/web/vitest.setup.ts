import "@testing-library/jest-dom/vitest";

// Mock localStorage with German language as default for tests
const storage: Record<string, string> = {
  language: "de",
};

const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
  },
  length: Object.keys(storage).length,
  key: (index: number) => Object.keys(storage)[index] ?? null,
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});
