# Eterna

Plataforma de sites de casamento: os noivos criam a identidade visual com IA, os convidados vivem o site antes, durante e depois do casamento, e todos constroem juntos uma memória digital.

> A história de vocês, construída por todos.

**Stack:** Next.js 16, React 19 e TypeScript, com PostgreSQL (Neon) acessado pelo driver `pg`. A IA usa o Google Gemini no plano gratuito, por uma API compatível com a da OpenAI, então dá para trocar de provedor.

## Como a experiência é organizada

Uma ação principal por tela e recursos apresentados quando fazem sentido.

| Área | Rota | O que a noiva faz |
| --- | --- | --- |
| Página inicial | `/` | Conhece a Eterna e toca em "Criar meu site" |
| Criação guiada | `/painel/novo` | Em 3 etapas: o casamento (só os nomes são obrigatórios), o sonho (descrição e imagens) e a primeira versão real do site, com "Gostei, continuar", "Quero ajustar" e "Tentar outro estilo" |
| Início | `/painel/[id]` | Vê a prévia, o status e um único "Próximo passo", escolhido pela situação e pela data do casamento |
| Meu site | `/painel/[id]/site` | Pede mudanças em palavras ao assistente ou edita nomes, data, local, textos, aparência (incluindo a foto de capa) e seções, com a prévia mudando enquanto digita. Salva sozinho, publica e compartilha. Versões e a prévia do site no dia e depois ficam em "Mais" |
| Convidados | `/painel/[id]/convidados` | Copia ou envia o link pelo WhatsApp, acompanha quem confirmou, recusou ou não respondeu e exporta a lista em CSV. Grupos são opcionais |
| Memórias | `/painel/[id]/memorias` | Ativa quando quiser, mostra o QR Code e revisa mensagens, histórias e fotos antes de publicar |
| Configurações | `/painel/[id]/configuracoes` | Fase do site, QR do site, dados do casamento, exportação e exclusão |
| Site do casal | `/c/[slug]` | Os convidados veem o site e confirmam presença (convite individual em `?convite=`) |
| Memórias do convidado | `/c/[slug]/memorias` | Abre pelo QR Code, escolhe como contribuir e envia, sem cadastro |
| Exemplo | `/exemplo` | Site fictício nas três fases, sem banco de dados |

Endereços antigos (`/editor`, `/estudio`, `/juntos`, `/fotos`) redirecionam para as áreas novas.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencham DATABASE_URL (e, se quiserem, AI_API_KEY)
npm run db:migrate           # cria as tabelas (aplica db/migrations uma única vez cada)
npm run dev                  # http://localhost:3000
```

Sem o `DATABASE_URL`, a landing, os planos e o site de exemplo funcionam, e a tela de login explica o que falta.

### IA (opcional)

A IA é gratuita: criem uma chave do Google Gemini em https://aistudio.google.com/apikey (não pede cartão) e coloquem em `AI_API_KEY`. O modelo padrão é o `gemini-3.1-flash-lite`. Para usar outro provedor gratuito compatível com a API da OpenAI (Groq, OpenRouter), mudem `AI_BASE_URL` e `AI_MODEL`; o `.env.example` tem os exemplos.

Limites do plano gratuito do Gemini:
- **Uso:** há um limite de pedidos por minuto e por dia, definido pelo Google para cada projeto e visível no AI Studio. Quando ele acaba, o estúdio avisa e pede para tentar mais tarde.
- **Privacidade:** no plano gratuito, o Google pode usar o conteúdo enviado para melhorar os modelos. Para não enviar textos de convidados à IA, usem `AI_CLASSIFY_CONTRIBUTIONS=false`. A sugestão de capítulo fica desligada e o resto continua igual.

Com a chave configurada, a IA:
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
