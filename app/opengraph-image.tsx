import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";
export const alt = `${SITE_NAME} social preview`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const LANGUAGE_BLOCKS = [
  { x: 24, y: 86, w: 330, h: 232, color: "#3178C6", label: "TypeScript", metric: "31.9M stars · 5,450 repos" },
  { x: 362, y: 86, w: 286, h: 160, color: "#3572A5", label: "Python", metric: "45.9M stars · 10,088 repos" },
  { x: 656, y: 86, w: 240, h: 126, color: "#F3E45A", label: "JavaScript", metric: "32.1M stars · 7,281 repos", dark: true },
  { x: 904, y: 86, w: 272, h: 150, color: "#8EEA54", label: "Shell", metric: "6.1M stars · 1,420 repos", dark: true },
  { x: 362, y: 254, w: 188, h: 124, color: "#00ADD8", label: "Go", metric: "18.8M stars · 3,735 repos" },
  { x: 558, y: 254, w: 152, h: 124, color: "#B07219", label: "Java", metric: "14.1M stars · 3,709 repos" },
  { x: 718, y: 220, w: 184, h: 158, color: "#4F5D95", label: "PHP", metric: "5.2M stars · 1,501 repos" },
  { x: 910, y: 244, w: 146, h: 134, color: "#F05138", label: "Swift", metric: "4.3M stars · 1,229 repos" },
  { x: 1064, y: 244, w: 112, h: 134, color: "#A97BFF", label: "Kotlin", metric: "3.3M stars · 881 repos" },
  { x: 24, y: 326, w: 220, h: 160, color: "#2A2A2A", label: "Awesome", metric: "3.2M stars · 845 repos" },
  { x: 252, y: 326, w: 198, h: 160, color: "#EF6A3A", label: "Daily", metric: "Momentum view" },
  { x: 458, y: 386, w: 300, h: 188, color: "#121212", label: "Search", metric: "q=skills" },
  { x: 766, y: 386, w: 188, h: 188, color: "#C93D7B", label: "C++", metric: "13.4M stars · 3,147 repos" },
  { x: 962, y: 386, w: 214, h: 188, color: "#2B2B2B", label: "Other", metric: "14.1M stars · 3,207 repos" },
];

const MICRO_BLOCKS = [
  { x: 44, y: 118, w: 112, h: 82, color: "rgba(255,255,255,0.14)" },
  { x: 162, y: 118, w: 170, h: 82, color: "rgba(255,255,255,0.11)" },
  { x: 44, y: 206, w: 88, h: 94, color: "rgba(255,255,255,0.12)" },
  { x: 138, y: 206, w: 98, h: 94, color: "rgba(255,255,255,0.10)" },
  { x: 242, y: 206, w: 90, h: 94, color: "rgba(255,255,255,0.09)" },
  { x: 382, y: 118, w: 136, h: 52, color: "rgba(255,255,255,0.12)" },
  { x: 524, y: 118, w: 104, h: 52, color: "rgba(255,255,255,0.08)" },
  { x: 382, y: 176, w: 76, h: 50, color: "rgba(255,255,255,0.11)" },
  { x: 464, y: 176, w: 76, h: 50, color: "rgba(255,255,255,0.10)" },
  { x: 546, y: 176, w: 82, h: 50, color: "rgba(255,255,255,0.08)" },
  { x: 676, y: 106, w: 84, h: 44, color: "rgba(0,0,0,0.12)" },
  { x: 766, y: 106, w: 110, h: 44, color: "rgba(0,0,0,0.08)" },
  { x: 924, y: 112, w: 102, h: 58, color: "rgba(0,0,0,0.10)" },
  { x: 1032, y: 112, w: 124, h: 58, color: "rgba(0,0,0,0.08)" },
  { x: 926, y: 178, w: 72, h: 38, color: "rgba(0,0,0,0.12)" },
  { x: 1004, y: 178, w: 68, h: 38, color: "rgba(0,0,0,0.10)" },
  { x: 1078, y: 178, w: 78, h: 38, color: "rgba(0,0,0,0.08)" },
  { x: 382, y: 274, w: 88, h: 42, color: "rgba(255,255,255,0.12)" },
  { x: 476, y: 274, w: 54, h: 42, color: "rgba(255,255,255,0.08)" },
  { x: 382, y: 322, w: 148, h: 36, color: "rgba(255,255,255,0.09)" },
  { x: 736, y: 240, w: 62, h: 56, color: "rgba(255,255,255,0.12)" },
  { x: 804, y: 240, w: 78, h: 56, color: "rgba(255,255,255,0.08)" },
  { x: 738, y: 302, w: 144, h: 56, color: "rgba(255,255,255,0.09)" },
  { x: 930, y: 266, w: 58, h: 48, color: "rgba(255,255,255,0.10)" },
  { x: 994, y: 266, w: 44, h: 48, color: "rgba(255,255,255,0.08)" },
  { x: 44, y: 348, w: 92, h: 58, color: "rgba(255,255,255,0.06)" },
  { x: 142, y: 348, w: 82, h: 58, color: "rgba(255,255,255,0.09)" },
  { x: 44, y: 412, w: 180, h: 54, color: "rgba(255,255,255,0.10)" },
  { x: 274, y: 350, w: 156, h: 58, color: "rgba(255,255,255,0.12)" },
  { x: 274, y: 414, w: 156, h: 52, color: "rgba(255,255,255,0.08)" },
  { x: 478, y: 410, w: 96, h: 64, color: "rgba(255,255,255,0.08)" },
  { x: 580, y: 410, w: 76, h: 64, color: "rgba(255,255,255,0.12)" },
  { x: 662, y: 410, w: 76, h: 64, color: "rgba(255,255,255,0.08)" },
  { x: 784, y: 410, w: 54, h: 48, color: "rgba(255,255,255,0.09)" },
  { x: 844, y: 410, w: 90, h: 48, color: "rgba(255,255,255,0.07)" },
  { x: 784, y: 464, w: 150, h: 88, color: "rgba(255,255,255,0.08)" },
  { x: 982, y: 410, w: 84, h: 72, color: "rgba(255,255,255,0.08)" },
  { x: 1072, y: 410, w: 84, h: 72, color: "rgba(255,255,255,0.11)" },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#0c0c0c",
          color: "white",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
          }}
        >
          {LANGUAGE_BLOCKS.map((block) => (
            <div
              key={`${block.label}-${block.x}-${block.y}`}
              style={{
                position: "absolute",
                left: block.x,
                top: block.y,
                width: block.w,
                height: block.h,
                display: "flex",
                borderRadius: 26,
                background: block.color,
                overflow: "hidden",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  top: 14,
                  fontSize: 18,
                  fontWeight: 700,
                  color: block.dark ? "#0c0c0c" : "rgba(255,255,255,0.88)",
                }}
              >
                {block.label}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  bottom: 14,
                  fontSize: 16,
                  color: block.dark ? "rgba(12,12,12,0.78)" : "rgba(255,255,255,0.7)",
                }}
              >
                {block.metric}
              </div>
            </div>
          ))}

          {MICRO_BLOCKS.map((block, index) => (
            <div
              key={`${block.x}-${block.y}-${index}`}
              style={{
                position: "absolute",
                left: block.x,
                top: block.y,
                width: block.w,
                height: block.h,
                borderRadius: 16,
                background: block.color,
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 28,
            top: 24,
            width: 1144,
            height: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            borderRadius: 18,
            background: "rgba(14,14,14,0.88)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 14px 36px rgba(0,0,0,0.28)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              GitHub
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 700,
                color: "#61dafb",
              }}
            >
              Treemap
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
            }}
          >
            {[
              ["Projects", "#61dafb"],
              ["Daily", "rgba(255,255,255,0.08)"],
              ["Awesome", "rgba(255,255,255,0.08)"],
            ].map(([label, background]) => (
              <div
                key={label}
                style={{
                  height: 32,
                  padding: "0 14px",
                  borderRadius: 10,
                  background,
                  color: background === "#61dafb" ? "#0c0c0c" : "rgba(255,255,255,0.72)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 28,
            top: 96,
            width: 398,
            height: 438,
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            padding: "28px",
            borderRadius: 30,
            background: "linear-gradient(180deg, rgba(12,12,12,0.88) 0%, rgba(12,12,12,0.68) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.34)",
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
                width: 20,
                height: 20,
                borderRadius: 999,
                background: "#61dafb",
              }}
            />
            <div
              style={{
                fontSize: 24,
                color: "#61dafb",
                fontWeight: 700,
              }}
            >
              {SITE_NAME}
            </div>
          </div>

          <div
            style={{
              fontSize: 64,
              lineHeight: 1.05,
              fontWeight: 700,
              maxWidth: "100%",
            }}
          >
            Explore GitHub like a map
          </div>

          <div
            style={{
              fontSize: 24,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.78)",
              maxWidth: "100%",
            }}
          >
            {SITE_DESCRIPTION}
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              marginTop: "8px",
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
                  minWidth: 108,
                  height: 42,
                  borderRadius: 14,
                  background: color,
                  color: "#0c0c0c",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "auto",
              width: "100%",
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 18px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: "rgba(255,255,255,0.68)",
                fontSize: 20,
              }}
            >
              Search...
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              q=skills
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
