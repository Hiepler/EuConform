"use client";

import { type ReactNode, createContext, useCallback, useContext, useState } from "react";
import type { CustomTestSuiteState, NormalizedTestCase } from "../types/custom-test-suite";

interface CustomTestSuiteContextValue extends CustomTestSuiteState {
  setCustomTestCases: (testCases: NormalizedTestCase[], fileName: string) => void;
  clearCustomTestCases: () => void;
  activateCustomTestSuite: () => void;
  deactivateCustomTestSuite: () => void;
}

const CustomTestSuiteContext = createContext<CustomTestSuiteContextValue | null>(null);

export function CustomTestSuiteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CustomTestSuiteState>({
    isLoading: false,
    error: null,
    fileName: null,
    testCases: [],
    isActive: false,
  });

  const setCustomTestCases = useCallback((testCases: NormalizedTestCase[], fileName: string) => {
    setState((prev) => ({
      ...prev,
      testCases,
      fileName,
      error: null,
      isActive: true,
    }));
  }, []);

  const clearCustomTestCases = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      fileName: null,
      testCases: [],
      isActive: false,
    });
  }, []);

  const activateCustomTestSuite = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: prev.testCases.length > 0 }));
  }, []);

  const deactivateCustomTestSuite = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false }));
  }, []);

  return (
    <CustomTestSuiteContext.Provider
      value={{
        ...state,
        setCustomTestCases,
        clearCustomTestCases,
        activateCustomTestSuite,
        deactivateCustomTestSuite,
      }}
    >
      {children}
    </CustomTestSuiteContext.Provider>
  );
}

export function useCustomTestSuite() {
  const context = useContext(CustomTestSuiteContext);
  if (!context) {
    throw new Error("useCustomTestSuite must be used within CustomTestSuiteProvider");
  }
  return context;
}
