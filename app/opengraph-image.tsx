import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fafafa",
          fontSize: 64,
          fontWeight: 600,
        }}
      >
        HireTrack
        <div style={{ fontSize: 28, color: "#a1a1aa", marginTop: 20, fontWeight: 400 }}>
          AI-powered hiring pipeline
        </div>
      </div>
    ),
    { ...size }
  );
}