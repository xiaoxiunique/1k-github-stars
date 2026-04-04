import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";
export const alt = `${SITE_NAME} social preview`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

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
          background: "#0c0c0c",
          color: "white",
          padding: "48px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
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
                width: 26,
                height: 26,
                borderRadius: 999,
                background: "#61dafb",
              }}
            />
            <div
              style={{
                fontSize: 28,
                color: "#61dafb",
              }}
            >
              {SITE_NAME}
            </div>
          </div>

          <div
            style={{
              fontSize: 72,
              lineHeight: 1.05,
              fontWeight: 700,
              maxWidth: "85%",
            }}
          >
            GitHub discovery as a treemap
          </div>

          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.78)",
              maxWidth: "82%",
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "18px",
          }}
        >
          {[
            ["Projects", "#3178C6"],
            ["Daily", "#F3E45A"],
            ["Awesome", "#8EEA54"],
          ].map(([label, color]) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 180,
                height: 72,
                borderRadius: 20,
                background: color,
                color: "#0c0c0c",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
