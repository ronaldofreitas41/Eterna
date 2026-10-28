import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos são reduzidas no navegador antes do envio; o servidor aceita até 4 MB por imagem (lib/files.ts).
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};

export default nextConfig;
