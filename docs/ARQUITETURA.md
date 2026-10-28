# Arquitetura da Eterna

## Decisão de stack

O briefing prefere Django, Django REST Framework, PostgreSQL, Celery e Redis, e aceita a stack nativa da ferramenta. Este MVP usa:

- **Next.js 16 (App Router) + React 19 + TypeScript**: interface, rotas e ações do servidor.
- **PostgreSQL no Neon**, acessado diretamente com o driver `pg`, sem ORM. As consultas ficam explícitas e parametrizadas.
- **IA por API compatível com a OpenAI** (padrão: Google Gemini 3.1 Flash-Lite, plano gratuito) para o estúdio criativo e a organização das contribuições.

A separação lógica permite migrar o backend para Django sem reescrever a interface:

| Camada | Onde está | Equivalente em Django |
| --- | --- | --- |
| Regras de domínio puras (design, tema, fases, seções, estúdio) | `lib/*.ts`, sem dependência de framework | `services/` |
| Acesso a dados e permissões | `lib/db.ts`, `lib/panel.ts`, `app/painel/acoes/*`, `app/c/actions.ts` | views do DRF, permissions e querysets por dono |
| Sessão e contas | `lib/auth.ts` | `django.contrib.auth` |
| Arquivos | `lib/files.ts` e `/api/arquivos/[id]` | storage S3 (django-storages) |
| Interface | `app/`, `components/` | sem mudança (consome a API) |

## Contas e sessão

- Senhas com **scrypt** (sal aleatório de 16 bytes, N = 16384). O banco guarda só o hash.
- Sessão em cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção, com token aleatório de 32 bytes. O banco guarda só o **SHA-256** do token. A sessão dura 30 dias.
- Recuperação de senha com token de uso único, válido por 1 hora. Ao trocar a senha, as outras sessões são encerradas.
- O login não revela se o e-mail existe: a mensagem é a mesma para e-mail inexistente e senha errada.
- O `proxy.ts` só barra o painel quando não há cookie. A validação real (sessão no banco e dono do casamento) acontece em cada página e em cada ação.

## Permissões (isolamento entre casais)

Toda página do painel chama `getOwnedWedding(id)`, e toda ação chama `ownedWeddingOrThrow(id)`. As duas buscam o casamento com `id = $1 and owner_id = <usuário da sessão>`. Depois disso, toda leitura e escrita filtra por `wedding_id`. Ids de grupos e capítulos vindos da interface são conferidos contra o mesmo casamento antes do uso.

Ações dos convidados (`app/c/actions.ts`), sem conta:

| Regra | Onde |
| --- | --- |
| Só sites publicados recebem RSVP, fotos e contribuições | `publishedWedding` |
| Convite individual pelo token; limite de pessoas do grupo | `submitInvitationRsvp` |
| Campanhas "só convidados" e "só grupos" exigem convite válido do grupo certo | `submitContribution` |
| Consentimento obrigatório (também garantido por `check` no banco) | contribuições e fotos |
| Tudo entra pendente; mensagens da cápsula entram lacradas | `status` inicial |

A **cápsula do tempo** só aparece para os noivos depois de `capsule_open_date`: a consulta do painel e a exportação filtram por data, e a moderação recusa alterar mensagens lacradas.

A **logística** (endereço, hospedagem e transporte) fica numa tabela separada. Ela só vai para o site público com `logistics_public`, ou pelo convite de um grupo com `sees_logistics`.

O **rascunho** do design (`wedding_drafts`) nunca é lido pelo site público. O público vê só o snapshot da versão publicada (`site_versions`).

Os testes em `tests/integracao.test.ts` exercitam essas regras contra o banco real.

## Arquivos

As imagens ficam na tabela `files` (bytea), com limite de 4 MB e tipos JPG, PNG, WEBP e GIF. O tipo é conferido pela assinatura do arquivo, não só pela extensão. O navegador reduz as fotos antes do envio para no máximo 2400 px, em JPEG a 86%.

`/api/arquivos/[id]` entrega cada arquivo de acordo com quem pede:
- ao dono, sempre;
- ao público, só a capa, fotos aprovadas e fotos de contribuições publicadas de sites publicados;
- referências visuais, nunca ao público.

Guardar no banco é simples e seguro para o MVP, mas não escala para álbuns grandes. O próximo passo é um storage compatível com S3 (Cloudflare R2, AWS S3), mantendo a mesma rota de verificação ou URLs assinadas.

## Modelo de dados

| Entidade | Tabela | Observações |
| --- | --- | --- |
| Usuários e sessões | `users`, `sessions`, `password_resets` | Hashes de senha e de token |
| Casamentos | `weddings` | `slug` único (URL pública), `custom_domain` reservado, `plan`, `is_demo`, fase, avisos ao vivo |
| Configuração visual (rascunho) | `wedding_drafts` | Tema, seções e textos, validados em `lib/design.ts` |
| Versões do site | `site_versions` | O público lê só `weddings.published_version_id` |
| Logística privada | `wedding_logistics` | Vista por permissão |
| Programação e tarefas | `schedule_items`, `tasks` | `day` opcional para vários dias |
| Convidados | `guest_groups`, `guests`, `rsvps` | Token de convite (UUID), limite por grupo |
| Construir Juntos | `story_chapters`, `campaigns`, `contributions` | Consentimento obrigatório; apresentação editada sem perder o original |
| Galeria | `photos` | Moderação |
| Estúdio | `design_references`, `studio_messages` | Referência por arquivo ou link `https://` |
| Arquivos | `files` | Apagados em cascata com o casamento |
| Planos | `lib/plans.ts` | Valores demonstrativos; sem cobrança |

Migrações: `db/migrations/NNN_nome.sql`, aplicadas em ordem por `npm run db:migrate` e registradas em `schema_migrations`.

## IA

- `lib/ai.ts` chama `chat/completions` de qualquer provedor compatível com a OpenAI (`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`), sem SDK, com `fetch`. O padrão é o Google Gemini no plano gratuito; Groq e OpenRouter também funcionam.
- Modelo padrão: `gemini-3.1-flash-lite`, que respondeu ao estúdio em cerca de 5 segundos nos testes, com raciocínio estendido desligado (`reasoning_effort: "none"`). O `gemini-2.5-flash` não está mais disponível para contas novas. Os modelos "flash" sem "lite" levaram de 60 a 100 segundos no plano gratuito, lentos demais para a tela de edição.
- Quando o Google responde 503 (sobrecarga), o mesmo modelo é tentado de novo após 1,5 segundo. Se continuar indisponível, sem cota (429) ou retirado (404), o sistema passa para `AI_FALLBACK_MODELS` (padrão: `gemini-flash-latest`). Chave recusada (401 ou 403) não troca de modelo.
- A resposta é pedida em JSON (`response_format: json_object`), com o JSON Schema gerado a partir do Zod e incluído nas instruções. Se a resposta vier fora do esquema, os erros voltam para o modelo e ele tem mais uma tentativa.
- Imagens de referência vão como `data:` URL. Links são baixados no servidor só se forem `https`, apontarem para endereços públicos (bloqueio de IPs internos), não redirecionarem, forem imagem e tiverem até 4 MB.
- Plano gratuito: limites de uso por projeto (HTTP 429 vira uma mensagem clara) e possível uso dos dados para treino pelo Google. `AI_CLASSIFY_CONTRIBUTIONS=false` impede que textos de convidados sejam enviados.
- O estúdio devolve sempre duas propostas. `applyProposal` aplica uma delas respeitando as travas (cores, tipografia, composição, textos), e cada proposta aplicada vira uma versão restaurável.
- Valores inválidos vindos da IA são descartados campo a campo.
- O modo demonstrativo (`lib/studio-demo.ts`) não chama nenhum serviço e aparece na interface como simulado.

## Dependências pendentes

| Item | Situação | O que falta |
| --- | --- | --- |
| Armazenamento de mídia em escala | Imagens no Postgres, até 4 MB cada | Storage S3/R2 e CDN de imagens |
| Domínio personalizado | Coluna `custom_domain` reservada | Resolver o host no `proxy.ts`, verificar DNS e emitir certificado |
| E-mail | Resend opcional, só para recuperação de senha | Convites e lembretes por e-mail ou WhatsApp |
| Pagamentos | Não implementado | Gateway (Stripe ou Mercado Pago), webhooks e regras de plano |
| Vídeos nas contribuições | Não implementado | Storage externo e transcodificação |
| Limite de tentativas | Não implementado | Rate limit no login, na recuperação de senha e nos envios públicos (ex.: Upstash Redis) |
| Confirmação de e-mail no cadastro | Não implementado (a conta fica ativa na hora) | Depende do envio de e-mail |
| Fila assíncrona | Não implementado | Geração por IA e processamento de imagens em jobs |
