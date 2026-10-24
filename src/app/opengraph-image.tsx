import { ImageResponse } from "next/og";

export const alt = "Scro — Inject a Soul into Your AI Influencer";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Default 1200x630 OpenGraph & Twitter card image rendered for Scro pages.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#0a0c10",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                backgroundColor: "#12141c",
                border: "2px solid rgba(198, 242, 75, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                fontWeight: 800,
                color: "#c6f24b",
              }}
            >
              S
            </div>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#ffffff",
              }}
            >
              Scro
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: "9999px",
              border: "1px solid rgba(198, 242, 75, 0.4)",
              backgroundColor: "#12141c",
              padding: "10px 22px",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#c6f24b",
            }}
          >
            AI Influencer · Soul Studio
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            maxWidth: "980px",
          }}
        >
          <div
            style={{
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Inject a soul into your AI Influencer.
          </div>
          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.45,
              color: "rgba(255, 255, 255, 0.76)",
            }}
          >
            One locked face, root-anchored custom wardrobe, 21-language voice cloning, Life feed photos, and AI-directed short videos.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.14)",
            paddingTop: "28px",
            fontSize: "20px",
            color: "rgba(255, 255, 255, 0.65)",
          }}
        >
          <div style={{ display: "flex", gap: "28px" }}>
            <span style={{ color: "#c6f24b", fontWeight: 600 }}>Identity Lock</span>
            <span>·</span>
            <span>Custom Wardrobe</span>
            <span>·</span>
            <span>Life Feed</span>
            <span>·</span>
            <span>AI Video Director</span>
          </div>
          <span style={{ color: "#ffffff", fontWeight: 600 }}>scro.io</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
