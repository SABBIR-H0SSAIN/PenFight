import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  poweredByHeader: false,
  devIndicators: false,
  headers() {
    return [
      {
        source: "/fonts/:font(.+\\.woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source:
          "/models/pens/:model(matador-hi-school|matador-smoothy|matador-all-time|matador-i-teen).glb",
        has: [{ type: "query", key: "v", value: "[a-f0-9]{12}" }],
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  redirects() {
    return [
      { source: "/game/index.html", destination: "/", permanent: true },
      { source: "/pen_fight_game.html", destination: "/", permanent: true },
    ];
  },
};
export default nextConfig;
