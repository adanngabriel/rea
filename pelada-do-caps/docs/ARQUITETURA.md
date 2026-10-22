# Arquitetura — Portal do Torneio da Pelada do Caps

## 1. Referência

O site de referência (villacup) não pôde ser acessado do ambiente de
desenvolvimento (falha de DNS). As ideias funcionais foram derivadas do
briefing: portal público com agenda, tabela, artilharia, chaveamento e
exportações para redes sociais, com administração completa.

## 2. Princípios

1. **Uma única fonte da verdade.** O que se digita: partidas, eventos da
   súmula (gols, cartões, craque), escalações opcionais, inscrições, regras.
   O que se calcula: placar, classificação, artilharia, assistências, cartões,
   suspensões automáticas, chaveamento, campeão, destaques e exportações.
   Nada derivado é armazenado — corrigir um gol corrige tudo.
2. **Nenhuma regra esportiva no código.** Pontuação, critérios de desempate,
   disciplina e formato do mata-mata ficam em `editions.rules` (JSON validado
   por `src/domain/rules.ts`). Valores não informados ficam "a definir".
3. **Segurança em duas camadas.** Server Actions conferem o administrador no
   servidor; o banco (RLS) só aceita escrita de `public.admins`.
4. **Celular primeiro.** Barra inferior de navegação, tabelas com coluna
   fixa, súmula operável com uma mão, imagens reduzidas antes do upload.

## 3. Componentes

```
Navegador ──► Next.js (Vercel)
               ├─ páginas públicas (ISR 60 s + invalidação imediata ao salvar)
               ├─ painel /admin (dinâmico, sessão por cookie)
               ├─ Server Actions  ──► Supabase Postgres (RLS) + auditoria
               └─ /api cards | PDF | CSV (gerados dos dados atuais)
Navegador ──► Supabase Realtime (placar, súmula, sorteio ao vivo)
Navegador ──► Supabase Storage (upload direto do painel, só admins)
```

- **Domínio** (`src/domain`): funções puras e testadas — `standings`
  (critérios aplicados em sequência, confronto direto como mini-tabela entre
  os empatados, empates não resolvidos sinalizados), `stats`, `discipline`
  (suspensões cumpridas em sequência nas partidas encerradas do time),
  `bracket` (slots com origem "Nº colocado" ou "vencedor/perdedor de"),
  `schedule`, `share-text`.
- **Snapshot**: cada página carrega o retrato completo da edição (poucas
  centenas de linhas) e deriva o que precisa. Garante consistência entre
  páginas e evita consultas duplicadas.
- **Cache**: leituras públicas usam `fetch` com tag `public-data`
  (revalidação de 60 s); toda Server Action chama `updateTag`, então o
  público vê a mudança na hora. O Realtime dispara `router.refresh()`.

## 4. Banco de dados

| Tabela | Papel |
| --- | --- |
| `tournaments`, `editions` | Torneio e edições (uma marcada como atual); `rules` em JSON |
| `rounds` | Calendário (rodadas e fases) |
| `teams` | Times por edição (escudo, cores, foto) |
| `players`, `player_admin_notes` | Pessoa (reaproveitada entre edições) e notas internas |
| `registrations` | Inscrição na edição: time, camisa, pote, capitão |
| `matches` | Partidas; `bracket_slot` liga ao chaveamento; `teams_locked` = ajuste manual |
| `match_events` | Súmula: gol, gol contra, amarelo, vermelho, craque |
| `match_lineups` | Escalação opcional |
| `suspensions` | Apenas decisões manuais: suspensão extra ou anulação de automática |
| `awards` | Campeão, vice, prêmios individuais, destaques da rodada |
| `news`, `press_links`, `documents`, `gallery_albums`, `gallery_items`, `sponsors` | Conteúdo |
| `site_settings` | Identidade do site |
| `admins`, `audit_logs` | Autorização e histórico |

Integridade garantida no banco: times de um evento pertencem à partida,
um capitão e um craque por partida, camisa única por time, chaves compostas
impedindo misturar edições, `finished_at` automático.

## 5. Autenticação e uploads

- Supabase Auth (e-mail/senha), cadastro público desativado, administradores
  em `public.admins`, criados por `npm run admin:create`.
- `proxy.ts` renova a sessão; o layout do painel e cada Server Action exigem
  `is_admin()`; o RLS repete a verificação.
- Buckets `media` (imagens, 8 MB) e `documents` (PDF, 20 MB): leitura pública,
  escrita só de admins, tipos de arquivo restritos. O painel reduz fotos no
  navegador antes do envio; o servidor só aceita URLs do próprio Storage.

## 6. Verificação realizada

- `npm test`: 17 testes de domínio (correção de placar, desempates, gol
  contra, disciplina, mata-mata com pênaltis e ajuste manual, fuso horário,
  texto WhatsApp).
- `supabase/tests/run.sh`: migrations num PostgreSQL limpo, idempotência dos
  dados iniciais e testes de RLS (público, usuário comum e admin).
- Fluxo ponta a ponta com navegador real contra PostgreSQL + PostgREST +
  GoTrue (os mesmos serviços do Supabase): login, cadastro em lote, sorteio
  com desfazer, geração de jogos, súmula, correção de placar, mata-mata,
  disciplina, notícia, auditoria, páginas públicas em 390 px sem rolagem
  horizontal, imagens, PDF e CSV.
- **Não verificado localmente**: Supabase Storage (upload) e Realtime — os
  contêineres não puderam ser baixados no ambiente. O código usa as APIs
  oficiais; confira no primeiro uso real (enviar um escudo e abrir `/sorteio`
  em outro aparelho enquanto move um jogador).

## 7. Próximos passos possíveis

- Votação popular de craque da rodada (exige controle antifraude).
- Página por edição antiga (`/edicoes/[slug]`) — a estrutura já suporta.
- Notificações push de gols.
