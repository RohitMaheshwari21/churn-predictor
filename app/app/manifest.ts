import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Churn Radar",
    short_name: "Churn Radar",
    description: "Explainable customer-churn risk scoring for retention teams.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f3eee4",
    theme_color: "#f3eee4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
