import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  redirects() {
    return [
      { source: "/game/index.html", destination: "/", permanent: true },
      { source: "/pen_fight_game.html", destination: "/", permanent: true },
    ];
  },
};
export default nextConfig;
