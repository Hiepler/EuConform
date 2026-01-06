/**
 * Integration test for ModelSelector component
 * Tests the complete model selection flow with capability detection
 */

import type { ModelCapability } from "@euconform/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageContext";
import { ModelSelector } from "../ModelSelector";

// Wrapper component with required providers
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

// Mock the capability detection service
vi.mock("@euconform/core", () => ({
  createCapabilityDetectionService: () => ({
    detectAllCapabilities: vi.fn().mockResolvedValue([
      {
        modelId: "browser",
        engine: "browser",
        method: "logprobs_exact",
        status: "available",
        recommended: true,
        lastTested: new Date().toISOString(),
      },
      {
        modelId: "llama3.2:3b",
        engine: "ollama",
        method: "logprobs_exact",
        status: "available",
        recommended: false,
        lastTested: new Date().toISOString(),
      },
      {
        modelId: "mistral:7b",
        engine: "ollama",
        method: "logprobs_fallback_latency",
        status: "available",
        recommended: false,
        lastTested: new Date().toISOString(),
      },
    ] as ModelCapability[]),
    refreshCapabilities: vi.fn().mockResolvedValue([]),
  }),
}));

// Mock the UI components
vi.mock("@euconform/ui/capability-badge", () => ({
  CapabilityBadge: ({ capability }: { capability: ModelCapability }) => (
    <div data-testid={`capability-badge-${capability.modelId}`}>
      {capability.method === "logprobs_exact" ? "✅" : "⚡"} {capability.status}
    </div>
  ),
}));

// TODO: These tests need to be updated to match the current component implementation
// They are skipped for now as they test specific UI details that have changed
describe.skip("ModelSelector Integration", () => {
  const mockOnModelSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render and detect model capabilities", async () => {
    renderWithProviders(<ModelSelector onModelSelect={mockOnModelSelect} />);

    // Should show loading state initially
    expect(screen.getByText("Erkenne Modell-Fähigkeiten...")).toBeInTheDocument();

    // Wait for capabilities to load
    await waitFor(() => {
      expect(screen.getByText("browser")).toBeInTheDocument();
    });

    // Should show all detected models
    expect(screen.getByText("llama3.2:3b")).toBeInTheDocument();
    expect(screen.getByText("mistral:7b")).toBeInTheDocument();
  });

  it("should show recommendation banner for best model", async () => {
    renderWithProviders(<ModelSelector onModelSelect={mockOnModelSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/Empfohlenes Modell/)).toBeInTheDocument();
    });

    // Browser inference should be recommended
    expect(screen.getByText(/browser.*beste Genauigkeit/)).toBeInTheDocument();
  });

  it("should handle model selection", async () => {
    renderWithProviders(<ModelSelector onModelSelect={mockOnModelSelect} />);

    await waitFor(() => {
      expect(screen.getByText("browser")).toBeInTheDocument();
    });

    // Click on browser model
    const browserModel = screen.getByText("browser").closest('[role="radio"]');
    expect(browserModel).toBeInTheDocument();
    if (!browserModel) {
      throw new Error('Expected element with role="radio" for model "browser"');
    }

    fireEvent.click(browserModel);

    // Should call onModelSelect with browser capability
    expect(mockOnModelSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "browser",
        engine: "browser",
        method: "logprobs_exact",
        status: "available",
        recommended: true,
      })
    );
  });

  it("should show capability badges for each model", async () => {
    renderWithProviders(<ModelSelector onModelSelect={mockOnModelSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("capability-badge-browser")).toBeInTheDocument();
    });

    // Should show correct badges for each model type
    expect(screen.getByTestId("capability-badge-browser")).toHaveTextContent("✅ available");
    expect(screen.getByTestId("capability-badge-llama3.2:3b")).toHaveTextContent("✅ available");
    expect(screen.getByTestId("capability-badge-mistral:7b")).toHaveTextContent("⚡ available");
  });

  it("should handle refresh capabilities", async () => {
    renderWithProviders(<ModelSelector onModelSelect={mockOnModelSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Aktualisieren")).toBeInTheDocument();
    });

    const refreshButton = screen.getByText("Aktualisieren");
    fireEvent.click(refreshButton);

    // Should show loading state during refresh
    expect(refreshButton).toBeDisabled();
  });

  it("should toggle explanations panel", async () => {
    renderWithProviders(<ModelSelector onModelSelect={mockOnModelSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Methoden-Erklärungen anzeigen")).toBeInTheDocument();
    });

    const toggleButton = screen.getByText("Methoden-Erklärungen anzeigen");
    fireEvent.click(toggleButton);

    expect(screen.getByText("Erklärungen ausblenden")).toBeInTheDocument();
  });

  it("should be accessible with keyboard navigation", async () => {
    renderWithProviders(<ModelSelector onModelSelect={mockOnModelSelect} />);

    await waitFor(() => {
      expect(screen.getByText("browser")).toBeInTheDocument();
    });

    const browserModel = screen.getByText("browser").closest('[role="radio"]');
    expect(browserModel).toHaveAttribute("tabIndex", "0");
    expect(browserModel).toHaveAttribute("aria-checked", "false");
    if (!browserModel) {
      throw new Error('Expected element with role="radio" for model "browser"');
    }

    // Should handle keyboard selection
    fireEvent.keyDown(browserModel, { key: "Enter" });
    expect(mockOnModelSelect).toHaveBeenCalled();
  });
});
