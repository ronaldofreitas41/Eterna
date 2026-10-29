import type { Theme } from "./theme";

export type Preset = { id: string; name: string; description: string; theme: Theme };

export const PRESETS: Preset[] = [
  {
    id: "botanico",
    name: "Botânico sálvia",
    description: "Marfim, verde sálvia e folhagens finas.",
    theme: {
      palette: { background: "#FBF8F2", surface: "#F0EEE4", ink: "#22201C", muted: "#625D52", accent: "#6F8B70" },
      displayFont: "bodoni",
      bodyFont: "instrument",
      layout: "centered",
      navStyle: "center",
      buttonStyle: "solid",
      ornament: "foliage",
      effect: "petals",
      splineUrl: "",
    },
  },
  {
    id: "classico",
    name: "Clássico marfim",
    description: "Serifas clássicas, bege e flores delicadas.",
    theme: {
      palette: { background: "#FAF6EE", surface: "#F1E9DA", ink: "#2A2520", muted: "#6A5F52", accent: "#8C7356" },
      displayFont: "cormorant",
      bodyFont: "lora",
      layout: "centered",
      navStyle: "center",
      buttonStyle: "outline",
      ornament: "florals",
      effect: "lights",
      splineUrl: "",
    },
  },
  {
    id: "minimalista",
    name: "Minimalista",
    description: "Branco, preto suave e muito espaço.",
    theme: {
      palette: { background: "#FFFFFF", surface: "#F4F4F2", ink: "#1C1C1A", muted: "#62625E", accent: "#1C1C1A" },
      displayFont: "italiana",
      bodyFont: "instrument",
      layout: "editorial",
      navStyle: "split",
      buttonStyle: "outline",
      ornament: "line",
      effect: "none",
      splineUrl: "",
    },
  },
  {
    id: "romantico",
    name: "Romântico blush",
    description: "Rosa antigo, caligrafia e cantos suaves.",
    theme: {
      palette: { background: "#FBF5F2", surface: "#F3E6E0", ink: "#2E2422", muted: "#6E5A55", accent: "#A8665C" },
      displayFont: "pinyon",
      bodyFont: "figtree",
      layout: "centered",
      navStyle: "pill",
      buttonStyle: "pill",
      ornament: "florals",
      effect: "petals",
      splineUrl: "",
    },
  },
  {
    id: "editorial",
    name: "Revista",
    description: "Composição editorial com Bodoni e verde profundo.",
    theme: {
      palette: { background: "#F8F6F1", surface: "#ECE8DE", ink: "#1D2A22", muted: "#56615A", accent: "#2F5A43" },
      displayFont: "bodoni",
      bodyFont: "instrument",
      layout: "editorial",
      navStyle: "split",
      buttonStyle: "solid",
      ornament: "none",
      effect: "rings",
      splineUrl: "",
    },
  },
  {
    id: "praia",
    name: "Destination à beira-mar",
    description: "Areia, azul petróleo e capa com foto.",
    theme: {
      palette: { background: "#F7F2E8", surface: "#ECE3D2", ink: "#1F2A2C", muted: "#5A6466", accent: "#3D6F78" },
      displayFont: "marcellus",
      bodyFont: "figtree",
      layout: "split",
      navStyle: "pill",
      buttonStyle: "pill",
      ornament: "foliage",
      effect: "lights",
      splineUrl: "",
    },
  },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id);
