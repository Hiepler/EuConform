import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MethodStatusIndicator } from "../components/MethodStatusIndicator";
import type { BiasCalculationMethod, InferenceEngine } from "../components/MethodStatusIndicator";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

describe("MethodStatusIndicator", () => {
  const defaultProps = {
    method: "logprobs_exact" as BiasCalculationMethod,
    engine: "browser" as InferenceEngine,
    model: "test-model",
  };

  describe("rendering", () => {
    it("should render with browser exact method", () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      expect(screen.getByText("✅")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Berechnet mit exakten Log-Probabilities (wissenschaftlicher Gold-Standard)"
        )
      ).toBeInTheDocument();
    });

    it("should render with ollama exact method", () => {
      render(<MethodStatusIndicator {...defaultProps} engine="ollama" />);

      expect(screen.getByText("✅")).toBeInTheDocument();
      expect(
        screen.getByText("Berechnet mit echten Log-Probabilities (via Ollama)")
      ).toBeInTheDocument();
    });

    it("should render with fallback latency method", () => {
      render(
        <MethodStatusIndicator
          {...defaultProps}
          method="logprobs_fallback_latency"
          engine="ollama"
        />
      );

      expect(screen.getByText("⚡")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Geschätzt mittels Inference-Latency (Fallback – Modell oder Ollama-Version unterstützt keine LogProbs)"
        )
      ).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <MethodStatusIndicator {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild?.firstChild).toHaveClass("custom-class");
    });
  });

  describe("styling", () => {
    it("should apply green styling for exact methods", () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-green-50", "text-green-800");
    });

    it("should apply yellow styling for fallback methods", () => {
      render(<MethodStatusIndicator {...defaultProps} method="logprobs_fallback_latency" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-yellow-50", "text-yellow-800");
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label");
      // Buttons have implicit tabIndex=0, so we just check it's focusable
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("should be keyboard navigable", () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      button.focus();
      expect(button).toHaveFocus();
    });

    it("should toggle tooltip with Enter key", async () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: "Enter" });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "true");
      });
    });

    it("should toggle tooltip with Space key", async () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: " " });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });

    it("should close tooltip with Escape key", async () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");

      // Open tooltip
      fireEvent.keyDown(button, { key: "Enter" });
      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Close with Escape
      fireEvent.keyDown(button, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });
  });

  describe("tooltip functionality", () => {
    it("should show tooltip on mouse enter", async () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });

    it("should hide tooltip on mouse leave", async () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      fireEvent.mouseLeave(button);

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });

    it("should show tooltip on focus", async () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.focus(button);

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });

    it("should hide tooltip on blur", async () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.focus(button);

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      fireEvent.blur(button);

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });
  });

  describe("tooltip content", () => {
    it("should show correct content for browser exact method", async () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText("Exakte Log-Probability Methode")).toBeInTheDocument();
        expect(
          screen.getByText(/Verwendet echte Log-Probabilities direkt vom Sprachmodell/)
        ).toBeInTheDocument();
        expect(
          screen.getByText("Dies ist die wissenschaftlich präziseste Methode zur Bias-Messung.")
        ).toBeInTheDocument();
      });
    });

    it("should show correct content for ollama exact method", async () => {
      render(<MethodStatusIndicator {...defaultProps} engine="ollama" />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText("Exakte Log-Probability Methode")).toBeInTheDocument();
        expect(screen.getByText(/Verwendet Log-Probabilities von Ollama/)).toBeInTheDocument();
      });
    });

    it("should show correct content for fallback method", async () => {
      render(
        <MethodStatusIndicator
          {...defaultProps}
          method="logprobs_fallback_latency"
          engine="ollama"
        />
      );

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText("Latency-Fallback Methode")).toBeInTheDocument();
        expect(
          screen.getByText(/wird die Inferenz-Latenz als Proxy verwendet/)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Für bessere Genauigkeit empfehlen wir ein Ollama-Update/)
        ).toBeInTheDocument();
      });
    });

    it("should include link to CrowS-Pairs paper", async () => {
      render(<MethodStatusIndicator {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /CrowS-Pairs Paper/ });
        expect(link).toHaveAttribute("href", "https://aclanthology.org/2020.emnlp-main.154");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });

  describe("edge cases", () => {
    it("should handle unknown method gracefully", () => {
      render(
        <MethodStatusIndicator
          {...defaultProps}
          method={"unknown_method" as BiasCalculationMethod}
        />
      );

      expect(screen.getByText("ℹ️")).toBeInTheDocument();
    });

    it("should handle long model names", () => {
      render(
        <MethodStatusIndicator
          {...defaultProps}
          model="very-long-model-name-that-might-cause-layout-issues"
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        expect.stringContaining("very-long-model-name-that-might-cause-layout-issues")
      );
    });
  });
});
