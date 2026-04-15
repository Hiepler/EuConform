import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "EuConform — Open Infrastructure for AI Act Evidence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        backgroundColor: "#f7f4ed",
        backgroundImage:
          "radial-gradient(circle at 12% 18%, rgba(215,208,243,0.55), transparent 42%), radial-gradient(circle at 88% 22%, rgba(215,230,244,0.55), transparent 42%), radial-gradient(circle at 50% 110%, rgba(232,218,201,0.55), transparent 40%)",
        fontFamily: "system-ui, sans-serif",
        color: "#17191c",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 9999,
            border: "1px solid rgba(42,50,67,0.18)",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.2em",
          }}
        >
          EC
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, fontWeight: 600 }}>EuConform</div>
          <div
            style={{
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: "#5b6370",
            }}
          >
            Evidence Infrastructure
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 980,
        }}
      >
        <div
          style={{
            fontSize: 18,
            textTransform: "uppercase",
            letterSpacing: "0.24em",
            color: "#5b6370",
          }}
        >
          Open specification for AI Act evidence
        </div>
        <div
          style={{
            fontSize: 80,
            lineHeight: 1.02,
            fontFamily: "Georgia, serif",
            letterSpacing: "-0.03em",
            color: "#17191c",
          }}
        >
          European AI compliance deserves infrastructure, not black boxes.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 22,
          color: "#17345c",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        <span>euconform.eu</span>
        <span style={{ color: "#5b6370" }}>scan → verify → view</span>
      </div>
    </div>,
    { ...size }
  );
}
