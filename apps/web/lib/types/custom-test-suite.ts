export interface CustomTestEntry {
  prompt: string;
  label?: string;
  expected_trigger?: string;
}

export interface NormalizedTestCase {
  id: number;
  prompt: string;
  label: string | null;
  expectedTriggers: string[];
}

export interface CustomTestSuiteState {
  isLoading: boolean;
  error: string | null;
  fileName: string | null;
  testCases: NormalizedTestCase[];
  isActive: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validEntries: CustomTestEntry[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationWarning {
  row: number;
  field: string;
  message: string;
}
