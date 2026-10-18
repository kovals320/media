import type { MetadataRoute } from "next";

// Makes the site installable as an app on phones ("Add to Home Screen" / "Install app").
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "המדיה של המשפחה",
    short_name: "המדיה",
    description: "התמונות והסרטים של המשפחה במקום אחד",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f7f2",
    theme_color: "#f6f7f2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
