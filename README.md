# Eterna

Plataforma de sites de casamento: os noivos criam a identidade visual com IA, os convidados vivem o site antes, durante e depois do casamento, e todos constroem juntos uma memória digital.

> A história de vocês, construída por todos.

**Stack:** Next.js 16, React 19 e TypeScript, com PostgreSQL (Neon) acessado pelo driver `pg`. A IA usa Claude, da Anthropic.

## O que já funciona

| Área | Rota |
| --- | --- |
| Landing com demonstração de paletas, planos e perguntas frequentes | `/` |
| Site de exemplo (Helena & Rafael, fictício) nas três fases, sem banco | `/exemplo` |
| Planos demonstrativos, em reais, sem cobrança | `/planos` |
| Cadastro, login, saída e recuperação de senha | `/entrar` |
| Onboarding em 6 etapas (só os nomes são obrigatórios) | `/painel/novo` |
| Casamento de demonstração completo, criado com um clique | `/painel` |
| Painel com progresso, tarefas, números e prévia | `/painel/[id]` |
| Estúdio criativo: referências (upload e link), duas propostas por pedido, travas, desfazer, versões | `/painel/[id]/estudio` |
| Editor: componentes (ligar, desligar, reordenar), visual, textos, prévia em computador e celular, rascunho, publicação, versões | `/painel/[id]/editor` |
| Convidados por grupo, convite individual, limite de acompanhantes, logística por permissão | `/painel/[id]/convidados` |
| Programação de um ou vários dias; hospedagem e transporte protegidos | `/painel/[id]/programacao` |
| Construir Juntos: campanhas por público, moderação, capítulos, apresentação editada, cápsula do tempo | `/painel/[id]/juntos` |
| Galeria colaborativa com moderação e capa do site | `/painel/[id]/fotos` |
| Fases (automática ou manual, sempre reversível), avisos ao vivo, QR Code, exportar e excluir dados | `/painel/[id]/configuracoes` |
| Site público por casamento, com convite individual em `?convite=` | `/c/[slug]` |

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencham DATABASE_URL (e, se quiserem, ANTHROPIC_API_KEY)
npm run db:migrate           # cria as tabelas (aplica db/migrations uma única vez cada)
npm run dev                  # http://localhost:3000
```

Sem o `DATABASE_URL`, a landing, os planos e o site de exemplo funcionam, e a tela de login explica o que falta.

### IA (opcional)

Com `ANTHROPIC_API_KEY` configurada, o estúdio usa o modelo `claude-opus-5-5`. A IA:
- gera duas propostas de design por pedido, a partir das referências e respeitando o que os noivos travaram;
- sugere o capítulo de cada contribuição e avisa quando um texto pode constranger.

Sem a chave, o estúdio entra em modo demonstrativo, identificado na tela. Nesse modo ele entende comandos como "mais minimalista", "troque as flores por folhagens", "use as cores da referência 2", "mude a composição" e "volte para a versão anterior", e aplica mudanças reais no design.

### E-mail (opcional)

A recuperação de senha envia o link pela Resend (`RESEND_API_KEY` e `EMAIL_FROM`). Sem essa configuração, nenhum e-mail é enviado. A tela avisa isso, e em desenvolvimento o link aparece no terminal do servidor.

## Testes

```bash
npm test          # lógica (18 testes) + integração com o banco (6 testes)
npm run typecheck
npm run build
```

Os testes de integração rodam contra o `DATABASE_URL` configurado. Eles criam dois casais e um visitante, e conferem:
- o isolamento entre casais;
- os convites e o limite de acompanhantes;
- o consentimento e o público das campanhas;
- a moderação e a cápsula lacrada;
- a permissão de cada arquivo.

No final, apagam tudo o que criaram (contas `@eterna.test`). Sem `DATABASE_URL`, os testes de integração são pulados.

## Estrutura

```
app/                  rotas: landing, login, painel, site público, APIs
app/painel/acoes/     ações do servidor do painel (sempre verificam o dono do casamento)
app/c/actions.ts      ações dos convidados (RSVP, fotos, contribuições)
components/site/      site público do casal (usado também nas prévias)
components/panel/     área de design, estúdio, editor, campos
lib/                  regras de negócio, acesso ao banco, sessão, arquivos, IA
db/migrations/        esquema do banco
scripts/migrate.mjs   aplica as migrações
tests/                testes de lógica e de integração (Vitest)
docs/ARQUITETURA.md   decisões técnicas e dependências pendentes
```
