"use client";

import type { Palette } from "./theme";
import { contrastRatio } from "./theme";

// Extrai uma paleta de uma imagem no navegador (quantização simples por cubos de cor).

type RGB = [number, number, number];
const toHex = ([r, g, b]: RGB) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
const lum = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const sat = ([r, g, b]: RGB) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export async function extractPalette(src: string): Promise<Palette | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null; // imagem de outro domínio sem CORS
  }

  const buckets = new Map<number, { sum: RGB; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const b = buckets.get(key) ?? { sum: [0, 0, 0] as RGB, n: 0 };
    b.sum[0] += data[i];
    b.sum[1] += data[i + 1];
    b.sum[2] += data[i + 2];
    b.n++;
    buckets.set(key, b);
  }
  const colors = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 16)
    .map((b) => b.sum.map((v) => v / b.n) as RGB);
  if (!colors.length) return null;

  const lightest = [...colors].sort((a, b) => lum(b) - lum(a))[0];
  const darkest = [...colors].sort((a, b) => lum(a) - lum(b))[0];
  const accent = [...colors].filter((c) => lum(c) > 40 && lum(c) < 200).sort((a, b) => sat(b) - sat(a))[0] ?? darkest;

  // Fundo claro e texto escuro garantem leitura mesmo quando a imagem é escura.
  const background = mix(lightest, [255, 253, 248], 0.75);
  const surface = mix(background, accent, 0.08);
  let ink = mix(darkest, [20, 20, 18], 0.6);
  if (contrastRatio(toHex(ink), toHex(background)) < 7) ink = [28, 26, 24];
  let muted = mix(ink, background, 0.35);
  if (contrastRatio(toHex(muted), toHex(background)) < 4.5) muted = mix(ink, background, 0.2);

  return { background: toHex(background), surface: toHex(surface), ink: toHex(ink), muted: toHex(muted), accent: toHex(accent) };
}
