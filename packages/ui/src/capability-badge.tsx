import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "./lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

// Import types from core package
export type BiasCalculationMethod = "logprobs_exact" | "logprobs_fallback_latency";
export type InferenceEngine = "browser" | "ollama";
export type CapabilityDetectionStatus = "detecting" | "available" | "unavailable" | "error";

export interface ModelCapability {
  modelId: string;
  engine: InferenceEngine;
  method: BiasCalculationMethod;
  status: CapabilityDetectionStatus;
  lastTested?: string;
  error?: string;
  recommended?: boolean;
}

const capabilityBadgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full border font-medium capability-badge capability-badge-hover focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:outline-none",
  {
    variants: {
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
      status: {
        detecting: "badge-detecting capability-badge-loading",
        browser: "badge-browser",
        exact: "badge-exact",
        fallback: "badge-fallback",
        unavailable: "badge-unavailable",
        error: "badge-error",
      },
    },
    defaultVariants: {
      size: "md",
      status: "exact",
    },
  }
);

export interface CapabilityBadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick">,
    VariantProps<typeof capabilityBadgeVariants> {
  capability: ModelCapability;
  showTooltip?: boolean;
  showRecommendation?: boolean;
  /** Additional ARIA description for screen readers */
  ariaDescription?: string;
  /** Whether the badge is part of a selection group */
  isSelectable?: boolean;
  /** Whether the badge is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: (event?: React.SyntheticEvent) => void;
}

interface BadgeConfig {
  icon: string;
  text: string;
  status: "detecting" | "browser" | "exact" | "fallback" | "unavailable" | "error";
  ariaLabel: string;
}

function getBadgeConfig(capability: ModelCapability): BadgeConfig {
  switch (capability.status) {
    case "detecting":
      return {
        icon: "🔄",
        text: "Teste Fähigkeiten...",
        status: "detecting",
        ariaLabel: "Modell-Fähigkeiten werden getestet",
      };

    case "available":
      if (capability.engine === "browser") {
        return {
          icon: "🧠",
          text: "Garantiert exakte Berechnung",
          status: "browser",
          ariaLabel: "Browser-Inferenz mit exakten Log-Probabilities",
        };
      }

      return capability.method === "logprobs_exact"
        ? {
            icon: "✅",
            text: "Exakte Log-Probabilities (Gold-Standard)",
            status: "exact",
            ariaLabel: "Unterstützt exakte Log-Probability-Berechnung",
          }
        : {
            icon: "⚡",
            text: "Latenz-Schätzung (Fallback)",
            status: "fallback",
            ariaLabel: "Verwendet Latenz-basierte Schätzung",
          };

    case "unavailable":
      return {
        icon: "❌",
        text: "Nicht verfügbar",
        status: "unavailable",
        ariaLabel: "Modell nicht verfügbar",
      };

    case "error":
      return {
        icon: "❌",
        text: "Fehler bei Erkennung",
        status: "error",
        ariaLabel: "Fehler bei der Fähigkeitserkennung",
      };

    default:
      return {
        icon: "ℹ️",
        text: "Unbekannter Status",
        status: "error",
        ariaLabel: "Unbekannter Fähigkeitsstatus",
      };
  }
}

function getTooltipContent(capability: ModelCapability): {
  title: string;
  description: string;
  recommendation?: string;
  showPaperLink?: boolean;
} {
  switch (capability.status) {
    case "detecting":
      return {
        title: "Fähigkeitserkennung läuft",
        description:
          "Das System testet gerade, welche Berechnungsmethoden dieses Modell unterstützt. Dies kann einige Sekunden dauern.",
      };

    case "available":
      if (capability.engine === "browser") {
        return {
          title: "Browser-Inferenz (Empfohlen)",
          description:
            "Verwendet client-seitige AI-Verarbeitung mit transformers.js. Garantiert exakte Log-Probability-Berechnungen und maximalen Datenschutz, da keine Daten das Gerät verlassen.",
          recommendation: "Dies ist die präziseste und datenschutzfreundlichste Option.",
          showPaperLink: true,
        };
      }

      if (capability.method === "logprobs_exact") {
        return {
          title: "Exakte Log-Probabilities (Gold-Standard)",
          description:
            "Dieses Ollama-Modell unterstützt echte Log-Probability-Berechnungen, die wissenschaftlich präziseste Methode für Bias-Messungen nach der CrowS-Pairs Methodologie.",
          recommendation: "Höchste Genauigkeit für wissenschaftliche Analysen.",
          showPaperLink: true,
        };
      }
      return {
        title: "Latenz-Schätzung (Fallback)",
        description:
          "Dieses Modell unterstützt keine Log-Probabilities. Die Bias-Messung erfolgt über Inferenz-Latenz als Proxy-Metrik, was weniger präzise ist.",
        recommendation:
          "Für bessere Genauigkeit empfehlen wir ein Ollama-Update oder ein Modell mit Log-Probability-Unterstützung.",
        showPaperLink: true,
      };

    case "unavailable":
      return {
        title: "Modell nicht verfügbar",
        description:
          "Dieses Modell ist derzeit nicht verfügbar. Möglicherweise ist Ollama nicht gestartet oder das Modell nicht installiert.",
        recommendation:
          "Starten Sie Ollama und stellen Sie sicher, dass das Modell installiert ist.",
      };

    case "error":
      return {
        title: "Erkennungsfehler",
        description:
          capability.error ||
          "Bei der Erkennung der Modell-Fähigkeiten ist ein Fehler aufgetreten.",
        recommendation: "Versuchen Sie es später erneut oder wählen Sie ein anderes Modell.",
      };

    default:
      return {
        title: "Unbekannter Status",
        description: "Der Status dieses Modells konnte nicht ermittelt werden.",
      };
  }
}

function CapabilityBadge({
  className,
  capability,
  size = "md",
  showTooltip = true,
  showRecommendation = true,
  ariaDescription,
  isSelectable = false,
  isSelected = false,
  onClick,
  ...props
}: CapabilityBadgeProps) {
  const config = getBadgeConfig(capability);
  const tooltipContent = getTooltipContent(capability);

  // Ensure size is a valid string, defaulting to "md" if null or undefined
  const validSize = size ?? "md";

  const innerBadge = (
    <BadgeInternal
      capability={capability}
      config={config}
      size={validSize}
      isSelected={isSelected}
      isSelectable={isSelectable}
      showRecommendation={showRecommendation}
      ariaDescription={ariaDescription}
      onClick={onClick}
      {...props}
    />
  );

  if (!showTooltip) return innerBadge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{innerBadge}</TooltipTrigger>
        <TooltipContent className="max-w-sm p-4 text-left space-y-2">
          <BadgeTooltipContent content={tooltipContent} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface BadgeInternalProps extends React.HTMLAttributes<HTMLDivElement> {
  capability: ModelCapability;
  config: BadgeConfig;
  size: "sm" | "md" | "lg";
  isSelected: boolean;
  isSelectable: boolean;
  showRecommendation: boolean;
  ariaDescription?: string;
  onClick?: (event?: React.SyntheticEvent) => void;
}

function BadgeInternal({
  capability,
  config,
  size,
  isSelected,
  isSelectable,
  showRecommendation,
  ariaDescription,
  onClick,
  className,
  ...props
}: BadgeInternalProps) {
  const descriptionId = ariaDescription ? `badge-desc-${capability.modelId}` : undefined;
  const fullAriaLabel = [
    config.ariaLabel,
    capability.modelId !== "browser" ? `Modell: ${capability.modelId}` : null,
    capability.recommended ? "Empfohlen" : null,
    ariaDescription,
  ]
    .filter(Boolean)
    .join(", ");

  const badgeRole = isSelectable ? "option" : "status";

  return (
    <div
      className={cn(
        capabilityBadgeVariants({ size, status: config.status }),
        onClick && "cursor-pointer",
        isSelected && "ring-2 ring-blue-500 ring-offset-2",
        className
      )}
      role={badgeRole}
      aria-label={fullAriaLabel}
      aria-describedby={descriptionId}
      aria-live={config.status === "detecting" ? "polite" : undefined}
      aria-selected={isSelectable ? isSelected : undefined}
      aria-disabled={capability.status === "unavailable" || capability.status === "error"}
      tabIndex={onClick ? 0 : undefined}
      onClick={
        onClick && capability.status !== "unavailable" && capability.status !== "error"
          ? onClick
          : undefined
      }
      onKeyDown={
        onClick && capability.status !== "unavailable" && capability.status !== "error"
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      {...props}
    >
      <BadgeContent
        config={config}
        capability={capability}
        showRecommendation={showRecommendation}
        ariaDescription={ariaDescription}
        descriptionId={descriptionId}
      />
    </div>
  );
}

function BadgeContent({
  config,
  capability,
  showRecommendation,
  ariaDescription,
  descriptionId,
}: {
  config: BadgeConfig;
  capability: ModelCapability;
  showRecommendation: boolean;
  ariaDescription?: string;
  descriptionId?: string;
}) {
  return (
    <>
      <span
        className={cn("badge-icon leading-none", config.status === "detecting" && "animate-spin")}
        aria-hidden="true"
        role="img"
        aria-label={`${config.icon} icon`}
      >
        {config.icon}
      </span>
      <span className="font-medium" id={`badge-text-${capability.modelId}`}>
        {config.text}
      </span>
      {ariaDescription && descriptionId && (
        <span id={descriptionId} className="sr-only">
          {ariaDescription}
        </span>
      )}
      {showRecommendation && capability.recommended && (
        <span className="recommendation-star ml-1" aria-label="Empfohlen" role="img">
          ⭐
        </span>
      )}
      {capability.status === "error" && capability.error && (
        <span className="sr-only">Fehler: {capability.error}</span>
      )}
    </>
  );
}

function BadgeTooltipContent({ content }: { content: ReturnType<typeof getTooltipContent> }) {
  return (
    <>
      <div className="font-semibold text-sm">{content.title}</div>
      <div className="text-xs leading-relaxed">{content.description}</div>
      {content.recommendation && (
        <div className="text-xs text-slate-400 dark:text-slate-500 italic">
          {content.recommendation}
        </div>
      )}
      {content.showPaperLink && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <a
            href="https://aclanthology.org/2020.emnlp-main.154"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:text-blue-600 underline"
          >
            📄 CrowS-Pairs Paper
          </a>
        </div>
      )}
    </>
  );
}

/**
 * Utility function to announce capability changes to screen readers
 */
export function announceCapabilityChange(capability: ModelCapability): void {
  const config = getBadgeConfig(capability);
  const message = `Modell ${capability.modelId}: ${config.ariaLabel}`;

  // Create a temporary live region for announcements
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Utility function to get keyboard navigation instructions
 */
export function getKeyboardInstructions(): string {
  return "Verwenden Sie die Pfeiltasten zum Navigieren zwischen Modellen, Eingabetaste oder Leertaste zum Auswählen, und Tab zum Verlassen der Auswahl.";
}

/**
 * Props for a group of capability badges with keyboard navigation
 */
export interface CapabilityBadgeGroupProps {
  capabilities: ModelCapability[];
  selectedCapability?: ModelCapability;
  onSelectionChange?: (capability: ModelCapability) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Wrapper component for a group of capability badges with proper keyboard navigation
 */
export function CapabilityBadgeGroup({
  capabilities,
  selectedCapability,
  onSelectionChange,
  ariaLabel = "Modell-Auswahl",
  className,
}: CapabilityBadgeGroupProps) {
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const badgeRefs = React.useRef<HTMLDivElement[]>([]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown": {
        event.preventDefault();
        const nextIndex = (index + 1) % capabilities.length;
        setFocusedIndex(nextIndex);
        badgeRefs.current[nextIndex]?.focus();
        break;
      }

      case "ArrowLeft":
      case "ArrowUp": {
        event.preventDefault();
        const prevIndex = (index - 1 + capabilities.length) % capabilities.length;
        setFocusedIndex(prevIndex);
        badgeRefs.current[prevIndex]?.focus();
        break;
      }

      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        badgeRefs.current[0]?.focus();
        break;

      case "End": {
        event.preventDefault();
        const lastIndex = capabilities.length - 1;
        setFocusedIndex(lastIndex);
        badgeRefs.current[lastIndex]?.focus();
        break;
      }
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-describedby="keyboard-instructions"
      className={cn("flex flex-wrap gap-2", className)}
    >
      <div id="keyboard-instructions" className="sr-only">
        {getKeyboardInstructions()}
      </div>
      {capabilities.map((capability, index) => (
        <div
          key={capability.modelId}
          ref={(el) => {
            if (el) badgeRefs.current[index] = el;
          }}
          tabIndex={index === focusedIndex ? 0 : -1}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={() => setFocusedIndex(index)}
        >
          <CapabilityBadge
            capability={capability}
            isSelectable={true}
            isSelected={selectedCapability?.modelId === capability.modelId}
            onClick={() => {
              if (capability.status === "available") {
                onSelectionChange?.(capability);
                announceCapabilityChange(capability);
              }
            }}
            showTooltip={true}
            showRecommendation={true}
          />
        </div>
      ))}
    </div>
  );
}

export { CapabilityBadge, capabilityBadgeVariants, getBadgeConfig, getTooltipContent };
