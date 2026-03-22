import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "MarketPhase - Journal de Trading Gratuit avec IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1628 0%, #0c2d4a 40%, #0e3a5c 60%, #0ea5e9 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            left: "-60px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            display: "flex",
          }}
        />

        {/* Logo icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100px",
            height: "100px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
            boxShadow: "0 8px 40px rgba(14, 165, 233, 0.4)",
            marginBottom: "28px",
            fontSize: "52px",
          }}
        >
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 17L9 11L13 15L21 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17 7H21V11"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-1px",
            marginBottom: "12px",
            display: "flex",
          }}
        >
          MarketPhase
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            fontWeight: 500,
            color: "rgba(148, 210, 245, 0.9)",
            marginBottom: "40px",
            display: "flex",
          }}
        >
          Journal de Trading Gratuit
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            padding: "16px 40px",
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <span style={{ fontSize: "22px", fontWeight: 700, color: "#0ea5e9" }}>35+</span>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>Outils</span>
          </div>

          <div
            style={{
              width: "1px",
              height: "36px",
              background: "rgba(255, 255, 255, 0.15)",
              display: "flex",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <span style={{ fontSize: "22px", fontWeight: 700, color: "#0ea5e9" }}>1200+</span>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>Traders</span>
          </div>

          <div
            style={{
              width: "1px",
              height: "36px",
              background: "rgba(255, 255, 255, 0.15)",
              display: "flex",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <span style={{ fontSize: "22px", fontWeight: 700, color: "#0ea5e9" }}>100%</span>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>Gratuit</span>
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "15px",
            color: "rgba(255, 255, 255, 0.35)",
            display: "flex",
          }}
        >
          marketphase.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
