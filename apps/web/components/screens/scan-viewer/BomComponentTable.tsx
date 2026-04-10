"use client";

import type { AiBillOfMaterials, BomComponentKind } from "@euconform/core/evidence";
import { useLanguage } from "../../../lib/i18n/LanguageContext";

interface BomComponentTableProps {
  aibom: AiBillOfMaterials;
}

const KIND_LABELS: Record<BomComponentKind, string> = {
  framework: "Framework",
  runtime: "Runtime",
  "inference-provider": "Inference Provider",
  "ai-framework": "AI Framework",
  model: "Model",
  "vector-store": "Vector Store",
  embedding: "Embedding",
  dataset: "Dataset",
  tool: "Tool",
};

const KIND_ORDER: BomComponentKind[] = [
  "inference-provider",
  "ai-framework",
  "model",
  "vector-store",
  "embedding",
  "framework",
  "runtime",
  "dataset",
  "tool",
];

export function BomComponentTable({ aibom }: BomComponentTableProps) {
  const { t } = useLanguage();

  if (aibom.components.length === 0) {
    return null;
  }

  const grouped = new Map<BomComponentKind, typeof aibom.components>();
  for (const component of aibom.components) {
    const existing = grouped.get(component.kind) ?? [];
    existing.push(component);
    grouped.set(component.kind, existing);
  }

  const sortedGroups = KIND_ORDER.flatMap((kind) => {
    const components = grouped.get(kind);
    return components ? [{ kind, components }] : [];
  });

  return (
    <div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
        {t("scan_viewer_bom_title")}
      </h3>
      <div className="rounded-xl border border-border dark:border-border-dark overflow-hidden bg-white dark:bg-slate-medium/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Kind
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Version
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map(({ kind, components }) =>
              components.map((component, i) => (
                <tr
                  key={component.id}
                  className="border-b border-border/50 dark:border-border-dark/50 last:border-0"
                >
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                    {i === 0 ? KIND_LABELS[kind] : ""}
                  </td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-100 font-medium">
                    {component.name}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {component.version ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs">
                    {component.source}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
