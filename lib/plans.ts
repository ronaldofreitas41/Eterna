import type { Plan } from "./types";

// Planos demonstrativos. Os preços são configuráveis aqui e não representam valores comerciais definidos.
// Não há cobrança: nenhuma integração de pagamento está configurada.

export const PLANS_ARE_DEMO = true;

export const PLANS: { id: Plan; name: string; priceCents: number; period: string; pitch: string; features: string[] }[] = [
  {
    id: "essencial",
    name: "Essencial",
    priceCents: 0,
    period: "para sempre",
    pitch: "O site do casamento com o que todo convidado precisa.",
    features: ["Site com endereço próprio na Eterna", "Personalização inicial com estilos prontos", "Confirmação de presença", "Informações do evento e programação"],
  },
  {
    id: "premium",
    name: "Premium",
    priceCents: 49000,
    period: "pagamento único",
    pitch: "Para quem quer uma identidade única e a memória coletiva completa.",
    features: [
      "Estúdio criativo com IA e referências visuais",
      "Editor completo com versões",
      "Construir Juntos e cápsula do tempo",
      "Grupos de convidados com informações específicas",
      "Domínio personalizado (quando a integração estiver disponível)",
    ],
  },
  {
    id: "destination",
    name: "Destination Wedding",
    priceCents: 89000,
    period: "pagamento único",
    pitch: "Para celebrações de vários dias, em outra cidade ou outro país.",
    features: ["Tudo do Premium", "Programação de vários dias", "Grupos de hospedagem e transporte", "Informações segmentadas por grupo", "Ferramentas avançadas de organização"],
  },
];
