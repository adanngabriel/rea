# Guia do Portal — Torneio da Pelada do Caps

Este guia foi escrito para quem tem pouca experiência com programação. Siga
as etapas na ordem. Tempo estimado da primeira instalação: 30 a 45 minutos.

Sumário:

1. [Visão geral](#1-visão-geral)
2. [Configurar o Supabase (banco, login e arquivos)](#2-configurar-o-supabase)
3. [Executar as migrations (criar as tabelas)](#3-executar-as-migrations)
4. [Variáveis de ambiente](#4-variáveis-de-ambiente)
5. [Rodar no seu computador](#5-rodar-no-seu-computador)
6. [Criar o primeiro administrador](#6-criar-o-primeiro-administrador)
7. [Publicar na internet (deploy na Vercel)](#7-publicar-na-internet-vercel)
8. [Domínio próprio (ex.: peladadocaps.com)](#8-domínio-próprio)
9. [Backup](#9-backup)
10. [Como administrar o torneio](#10-como-administrar-o-torneio)
11. [Perguntas frequentes](#11-perguntas-frequentes)

---

## 1. Visão geral

- **Site público**: qualquer pessoa acessa sem login (jogos, tabela, artilharia...).
- **Painel** (`/admin`): só administradores, com e-mail e senha.
- **Supabase**: serviço gratuito que guarda o banco de dados, os logins e os
  arquivos (escudos, fotos, PDFs). O plano gratuito atende com folga um
  torneio deste porte.
- **Vercel**: serviço gratuito que coloca o site no ar.

Nada importante fica "escrito no código": times, jogos, regras, notícias,
fotos e configurações são todos cadastrados pelo painel.

> Esta pasta (`pelada-do-caps/`) foi criada dentro de outro repositório. O
> ideal é movê-la para um repositório próprio no GitHub antes do deploy:
> crie um repositório vazio (ex.: `pelada-do-caps`), copie **o conteúdo desta
> pasta** para ele e faça o commit. Todos os passos abaixo consideram que a
> raiz do projeto é esta pasta.

## 2. Configurar o Supabase

1. Crie uma conta em <https://supabase.com> e clique em **New project**.
2. Nome: `pelada-do-caps`. Região: **South America (São Paulo)**. Crie uma
   senha forte para o banco e **guarde-a** (será usada no backup).
3. Aguarde o projeto ficar pronto (1–2 minutos).
4. **Desative o cadastro aberto** (importante): menu **Authentication →
   Sign In / Providers → Email** e desligue **Allow new users to sign up**.
   Mantenha o provedor *Email* ligado. Assim, só você cria usuários.
5. Em **Authentication → URL Configuration**, preencha **Site URL** com o
   endereço do site (depois do deploy, ex.: `https://peladadocaps.com`).

## 3. Executar as migrations

As *migrations* são os arquivos que criam as tabelas, as regras de segurança
e a estrutura inicial (edição 2026, rodadas e Time 1–4). Ficam em
`supabase/migrations/` e devem ser executadas **na ordem do nome**.

**Opção A — pelo navegador (mais simples):**

1. No Supabase, abra **SQL Editor → New query**.
2. Abra o arquivo `supabase/migrations/20261022000100_core_schema.sql`, copie
   todo o conteúdo, cole no editor e clique em **Run**.
3. Repita com `20261022000200_security.sql` e depois
   `20261022000300_initial_data.sql`.
4. Deve aparecer "Success" em cada um. O arquivo de dados iniciais pode ser
   executado de novo sem duplicar nada.

**Opção B — pela linha de comando:**

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF   # está na URL do painel do Supabase
npx supabase db push
```

Futuras atualizações do sistema podem trazer novos arquivos de migration;
execute apenas os novos, na ordem.

## 4. Variáveis de ambiente

No Supabase, abra **Project Settings → API** (ou **API Keys**) e copie:

| Variável | Onde encontrar | Pode ficar pública? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave `anon` / *publishable* | Sim (o banco só permite leitura ao público) |
| `NEXT_PUBLIC_SITE_URL` | o endereço do site, ex.: `https://peladadocaps.com` | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` / *secret* | **NÃO** — use só para criar o administrador no seu computador |

Copie o arquivo `.env.example` para `.env.local` e preencha os valores.

## 5. Rodar no seu computador

Pré-requisito: [Node.js 20 ou mais novo](https://nodejs.org) instalado.

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>. O painel fica em <http://localhost:3000/admin>.

## 6. Criar o primeiro administrador

Com o `.env.local` preenchido (incluindo `SUPABASE_SERVICE_ROLE_KEY`):

```bash
npm run admin:create -- seu-email@exemplo.com "uma-senha-bem-forte"
```

Pronto: entre em `/admin` com esse e-mail e senha. Para adicionar outro
administrador, rode o mesmo comando com outro e-mail. A senha pode ser trocada
depois em **Painel → Configurações**.

**Sem linha de comando (alternativa):** no Supabase, abra **Authentication →
Users → Add user → Create new user**, informe e-mail e senha e marque *Auto
confirm user*. Depois, no **SQL Editor**, execute:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'seu-email@exemplo.com';
```

## 7. Publicar na internet (Vercel)

1. Coloque o projeto num repositório do GitHub (veja a observação no item 1).
2. Crie uma conta em <https://vercel.com> com o seu GitHub.
3. **Add New → Project**, escolha o repositório e clique em **Import**.
4. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`.
   **Não** adicione a `SUPABASE_SERVICE_ROLE_KEY`.
5. Clique em **Deploy**. Em ~2 minutos o site estará no ar num endereço
   `*.vercel.app`.
6. Atualize o **Site URL** no Supabase (item 2.5) e o endereço em
   **Painel → Configurações**.

Cada novo commit no GitHub publica uma nova versão automaticamente.

> **Railway** também funciona: crie um serviço a partir do repositório, defina
> as mesmas variáveis e use `npm run build` / `npm start`.

## 8. Domínio próprio

1. Compre o domínio (ex.: `peladadocaps.com`) no Registro.br ou outro.
2. Na Vercel: **Project → Settings → Domains → Add** e siga as instruções de
   DNS (normalmente um registro `A` para `76.76.21.21` e um `CNAME` `www` para
   `cname.vercel-dns.com`).
3. Atualize `NEXT_PUBLIC_SITE_URL` na Vercel e faça um novo deploy
   (**Deployments → ⋯ → Redeploy**).
4. Atualize o **Site URL** no Supabase e o endereço em **Painel → Configurações**.

## 9. Backup

- **Planilhas rápidas**: **Painel → Exportações** baixa classificação, jogos e
  jogadores em CSV, e um relatório em PDF.
- **Backup completo do banco** (recomendado antes da final e ao fim do
  torneio): no Supabase, **Project Settings → Database → Connection string
  (URI)**, e no seu computador:

  ```bash
  pg_dump "postgresql://postgres:SUA_SENHA@db.SEU_PROJETO.supabase.co:5432/postgres" \
    --schema=public --data-only --file=backup-pelada-$(date +%F).sql
  ```

  Para restaurar num projeto novo: execute as migrations (item 3) e depois
  o arquivo de backup no SQL Editor (ou com `psql`).
- **Arquivos** (escudos, fotos, PDFs): em **Storage**, baixe as pastas dos
  buckets `media` e `documents`.
- Planos pagos do Supabase fazem backup diário automático.

## 10. Como administrar o torneio

### Antes do torneio

1. **Campeonato**: confira nome, datas, local, texto "Sobre" e envie o logo e a
   imagem de fundo. O calendário já vem com 1ª, 2ª, 3ª rodada e Final.
2. **Times**: troque "Time 1..4" pelos nomes reais, envie escudos, cores e
   foto.
3. **Jogadores**: use o **Cadastro em lote** colando a lista de inscritos
   (um por linha: `Nome; Apelido; Posição; Pote`).
4. **Classificação**: confirme pontos por vitória/empate/derrota e a ordem
   dos critérios de desempate.
5. **Cartões e suspensões**: defina as regras disciplinares (ex.: 3 amarelos
   = 1 jogo; vermelho = 1 jogo). Sem regra, ninguém é suspenso
   automaticamente.
6. **Mata-mata**: escolha o formato (Modelo A, B, C ou personalizado). Os
   jogos são criados automaticamente.
7. **Documentos**: publique o regulamento em PDF.
8. **Configurações**: endereço do site, Instagram, WhatsApp, patrocinadores.

### No dia do sorteio

Abra **Montagem dos times** no celular ou computador. A cada nome sorteado,
toque no botão do time correspondente. Errou? **Desfazer última alteração**.
Divulgue o link `/sorteio`: quem estiver acompanhando vê os elencos se
formando sem precisar atualizar a página. O **Sorteio automático** é só uma
ferramenta opcional.

### Montando a tabela de jogos

Em **Jogos e súmulas**, use **Gerar todos contra todos** (cria os 6 jogos da
fase classificatória distribuídos nas 3 rodadas) ou crie cada jogo em
**Novo jogo**. Depois, abra cada partida e defina **data e horário**.

### No dia da rodada

1. Abra **Jogos e súmulas → Súmula** da partida.
2. Quando a bola rolar, toque em **▶ Iniciar**. O site mostra **AO VIVO**.
3. A cada gol: escolha **Gol**, o time, o jogador e (se houver) a assistência
   e toque em **Registrar lance**. O placar do site muda sozinho.
4. Cartões: **Amarelo** ou **Vermelho**, time e jogador.
5. **Intervalo** e **▶ 2º tempo** quando for o caso.
6. Escolha o **Craque do jogo**.
7. Ao final, **🏁 Encerrar partida**. Classificação, artilharia, cartões,
   suspensões e chaveamento são recalculados automaticamente.

### Corrigindo erros

- Placar errado? Remova (🗑) o gol lançado por engano ou lance o que faltou. O
  placar **é** a soma dos gols da súmula — não existe placar digitado à parte,
  então tudo (tabela, artilharia, perfis) se corrige junto.
- Partida encerrada por engano? **Reabrir** na súmula.
- Suspensão injusta? Em **Cartões e suspensões**, use **Anular** com uma
  justificativa. Para punições extras, **Suspensão manual**.
- Mata-mata: em caso excepcional, abra o jogo, escolha os times e marque
  **Travar times**.
- Tudo fica registrado em **Histórico de alterações**.

### Depois da final

- O campeão aparece automaticamente em `/campeao` e no **Hall dos campeões**.
- Em **Premiações**, registre a foto da premiação, artilheiro, craque do
  torneio, melhor goleiro e outros prêmios.
- Publique as fotos em **Galeria** e as matérias em **Na mídia**.
- Para a próxima edição: **Campeonato → Edições → Criar edição** e depois
  **Tornar atual**.

### Divulgação

**Exportações** gera imagens prontas (Feed 4:5 e Story 9:16) de classificação,
confrontos, resultados e artilharia, um texto pronto para o WhatsApp, PDF,
planilhas e o QR Code do site.

## 11. Perguntas frequentes

**O site atualiza sozinho durante os jogos?** Sim. Placar, lances, tabela e
sorteio aparecem para quem está com a página aberta, sem recarregar.

**Alguém consegue alterar dados sem ser administrador?** Não. Toda escrita é
verificada no servidor e, de novo, pelo próprio banco (Row Level Security).
Mesmo que alguém crie uma conta, ela não tem permissão de escrita.

**Esqueci a senha.** Rode novamente `npm run admin:create` com o mesmo e-mail
e uma nova senha, ou redefina em **Supabase → Authentication → Users**.

**Quanto custa?** Supabase e Vercel têm planos gratuitos suficientes. O único
custo provável é o domínio (cerca de R$ 40/ano no Registro.br).
