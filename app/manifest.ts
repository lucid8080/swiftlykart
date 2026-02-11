import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SwiftlyKart",
    short_name: "SwiftlyKart",
    description: "A simple and beautiful grocery list app",
    start_url: "/",
    display: "standalone",
    background_color: "#fffbf5",
    theme_color: "#ed7712",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo/favicon_io1/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo/favicon_io1/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["shopping", "lifestyle", "utilities"],
  };
}
