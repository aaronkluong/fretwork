import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fretwork",
    short_name: "Fretwork",
    description: "Optimized guitar tablature and harmonic analysis powered by music theory and machine learning.",
    start_url: "/",
    display: "standalone",
    background_color: "#141415",
    theme_color: "#00BFA5",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
