import type { SiteDesign } from "./design";
import { DEFAULT_SECTIONS } from "./sections";
import { PRESETS } from "./presets";
import type { Audience, ContributionKind } from "./types";

// Casamento fictício de demonstração. Todos os nomes, datas e mensagens são inventados.

export const DEMO_COUPLE = {
  partner_one: "Helena",
  partner_two: "Rafael",
  slug: "helena-e-rafael-demo",
  wedding_date: "2027-05-15",
  city: "Itu, SP",
  venue: "Fazenda das Oliveiras",
  style: "Botânico, marfim e verde sálvia, sofisticado e emocional, com a história contada como linha do tempo.",
  capsule_open_date: "2028-05-15",
  live_notice: "A cerimônia começa às 16h30 no jardim. Em caso de chuva, será no salão principal.",
  mission: "Tire uma foto com alguém que você conheceu hoje e envie para o álbum.",
};

export const DEMO_DESIGN: SiteDesign = {
  theme: PRESETS[0].theme,
  sections: DEFAULT_SECTIONS,
  content: {
    inviteLine: "Com a alegria de suas famílias, convidam para o seu casamento",
    tagline: "Doze anos depois do primeiro café, a gente quer comemorar com quem fez parte do caminho.",
    story:
      "A gente se conheceu numa fila de café na Unicamp, em 2015, discutindo qual era o pior horário de aula da semana. Ninguém ganhou a discussão, mas o café virou almoço, o almoço virou cinema e o cinema virou uma década inteira.\n\nDepois vieram duas mudanças de cidade, um gato chamado Pimenta e uma viagem a Lisboa em que o Rafael passou três dias tentando esconder uma caixinha no bolso do casaco.\n\nAgora queremos celebrar com as pessoas que tornaram essa história possível.",
    timeline: [
      { date: "Março de 2015", title: "O primeiro café", text: "Uma fila longa, uma discussão sem vencedor e um convite para almoçar." },
      { date: "Agosto de 2018", title: "Primeiro apartamento", text: "Trinta metros quadrados em Campinas e uma planta que sobreviveu a tudo." },
      { date: "Junho de 2021", title: "Chega a Pimenta", text: "A gata que escolheu a gente numa feira de adoção." },
      { date: "Outubro de 2025", title: "O pedido em Lisboa", text: "No miradouro de Santa Luzia, com a caixinha finalmente fora do bolso." },
    ],
    ceremony: "Cerimônia ao ar livre no jardim de oliveiras, às 16h30. Chegue com 30 minutos de antecedência.",
    reception: "Recepção no salão da sede logo após a cerimônia, com jantar e pista de dança até 1h30.",
    dressCode: "Esporte fino. O gramado é macio: saltos finos podem afundar. Leve um casaco leve para a noite.",
    mapUrl: "https://www.openstreetmap.org/search?query=Itu%2C%20SP",
    faq: [
      { q: "Posso levar crianças?", a: "Sim, crianças são bem-vindas. Teremos um espaço kids durante a recepção." },
      { q: "Até quando confirmo presença?", a: "Pedimos que confirme até 15 de abril de 2027." },
      { q: "Haverá transporte?", a: "Sim, para convidados hospedados nos hotéis parceiros. Os horários aparecem no seu convite individual." },
    ],
    gifts: [
      { title: "Jantar em Lisboa", description: "Para voltar ao lugar do pedido.", url: "", priceCents: 45000 },
      { title: "Jogo de panelas", description: "Para o Rafael finalmente aprender a fazer risoto.", url: "", priceCents: 89000 },
      { title: "Cota da lua de mel", description: "Qualquer valor ajuda a gente a chegar em Portugal.", url: "", priceCents: null },
    ],
    giftsNote: "Sua presença é o melhor presente. Se quiser nos presentear, combine com os noivos a melhor forma.",
    thankYou:
      "Obrigado por terem vivido esse dia com a gente. Cada abraço, foto e mensagem agora faz parte da nossa história.",
  },
};

export const DEMO_LOGISTICS = {
  address: "Estrada das Oliveiras, km 4, Itu, SP (endereço fictício)",
  accommodation: "Bloqueio de quartos no Hotel Jardim de Itu até 1º de abril de 2027, com o código HELENAERAFAEL.",
  transport: "Vans saem do Hotel Jardim às 15h40 e retornam às 23h30 e 1h30.",
};

export const DEMO_SCHEDULE = [
  { starts_at: "16:00", title: "Recepção dos convidados", location: "Jardim de oliveiras", description: "Água aromatizada e música ao vivo." },
  { starts_at: "16:30", title: "Cerimônia", location: "Jardim de oliveiras", description: "" },
  { starts_at: "18:00", title: "Coquetel", location: "Varanda da sede", description: "" },
  { starts_at: "19:40", title: "Primeira dança", location: "Salão principal", description: "" },
  { starts_at: "20:00", title: "Jantar e pista", location: "Salão principal", description: "" },
  { starts_at: "22:00", title: "Corte do bolo", location: "Salão principal", description: "" },
];

export const DEMO_CHAPTERS = [
  { title: "Antes de se conhecerem", intro: "Quem eles eram antes da fila do café." },
  { title: "O encontro", intro: "Como tudo começou, contado por quem estava por perto." },
  { title: "Conselhos para a vida a dois", intro: "O que as pessoas que amamos desejam para nós." },
];

export const DEMO_GROUPS = [
  { name: "Família", max_party_size: 4, sees_logistics: true, message: "Família querida: reservamos a mesa perto da pista para vocês." },
  { name: "Padrinhos", max_party_size: 2, sees_logistics: true, message: "Padrinhos, a foto oficial é às 15h50 no jardim. Não se atrasem!" },
  { name: "Amigos", max_party_size: 2, sees_logistics: false, message: "" },
];

export const DEMO_GUESTS: { name: string; group: number; contact: string; attending: boolean | null; party_size: number }[] = [
  { name: "Lúcia Andrade", group: 0, contact: "lucia@exemplo.com", attending: true, party_size: 2 },
  { name: "Cida Moreira", group: 0, contact: "", attending: true, party_size: 1 },
  { name: "Bruno Lima", group: 1, contact: "bruno@exemplo.com", attending: true, party_size: 2 },
  { name: "Bia Santos", group: 1, contact: "", attending: null, party_size: 0 },
  { name: "Equipe do escritório", group: 2, contact: "", attending: false, party_size: 0 },
];

export const DEMO_CAMPAIGNS: { title: string; prompt: string; kind: ContributionKind; audience: Audience }[] = [
  { title: "Conte uma lembrança que você tem de nós", prompt: "Pode ser engraçada, emocionante ou só um detalhe que ficou.", kind: "memory", audience: "invited" },
  { title: "Envie uma fotografia antiga", prompt: "Fotos de infância, de viagens ou daquela festa em que ninguém lembra direito.", kind: "photo", audience: "invited" },
  { title: "Deixe um conselho para nossa vida a dois", prompt: "O que você aprendeu e gostaria que a gente soubesse.", kind: "advice", audience: "everyone" },
  { title: "Uma mensagem para abrirmos no nosso aniversário", prompt: "Ela fica lacrada até 15 de maio de 2028.", kind: "capsule", audience: "everyone" },
];

export const DEMO_CONTRIBUTIONS: {
  author_name: string;
  relation: string;
  kind: ContributionKind;
  campaign: number;
  chapter: number | null;
  status: "pending" | "published" | "capsule";
  title: string;
  body: string;
  ai_note: string;
}[] = [
  {
    author_name: "Bia Santos",
    relation: "amiga da faculdade",
    kind: "memory",
    campaign: 0,
    chapter: 1,
    status: "published",
    title: "A fila do café",
    body: "Eu estava atrás deles na fila. Juro que achei que iam brigar. Dez minutos depois estavam dividindo um pão de queijo.",
    ai_note: "",
  },
  {
    author_name: "Cida Moreira",
    relation: "avó do noivo",
    kind: "advice",
    campaign: 2,
    chapter: 2,
    status: "published",
    title: "",
    body: "Nunca durmam brigados. E quem cozinha não lava a louça.",
    ai_note: "",
  },
  {
    author_name: "Bruno Lima",
    relation: "padrinho do Rafael",
    kind: "memory",
    campaign: 0,
    chapter: null,
    status: "pending",
    title: "A caixinha",
    body: "O Rafael me ligou de Lisboa três vezes perguntando se o bolso do casaco era seguro o bastante para guardar o anel.",
    ai_note: "Combina com o capítulo “O encontro” ou com a linha do tempo do pedido.",
  },
  {
    author_name: "Lúcia Andrade",
    relation: "tia da noiva",
    kind: "memory",
    campaign: 0,
    chapter: null,
    status: "pending",
    title: "Festa junina de 1998",
    body: "A Helena com 6 anos se recusou a dançar quadrilha se não pudesse ser a noiva. Ela já sabia o que queria.",
    ai_note: "Combina com “Antes de se conhecerem”.",
  },
  {
    author_name: "Equipe do escritório",
    relation: "colegas do Rafael",
    kind: "memory",
    campaign: 0,
    chapter: null,
    status: "pending",
    title: "",
    body: "Vamos contar para todo mundo da vez em que o Rafael errou o nome da Helena no primeiro encontro?",
    ai_note: "Atenção: pode constranger o casal se publicado para todos.",
  },
  {
    author_name: "Lúcia Andrade",
    relation: "tia da noiva",
    kind: "capsule",
    campaign: 3,
    chapter: null,
    status: "capsule",
    title: "Para o primeiro aniversário",
    body: "Se vocês estiverem lendo isto, espero que ainda dividam o pão de queijo.",
    ai_note: "",
  },
];

/** Fotos ilustrativas da galeria de demonstração (sem imagens reais). */
export const DEMO_GALLERY_TONES = ["#C9D6C6", "#E6D8C3", "#B7C7B5", "#EDE4D6", "#D4DDCF", "#E2D2C0"];
