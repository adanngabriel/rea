# Torneio da Pelada do Caps — portal oficial

Site oficial do **1º Torneio da Pelada do Caps** (Inter Academy, 02 a 19/11/2026):
área pública para acompanhar o campeonato pelo celular e painel administrativo
para a organização controlar tudo sem mexer em código.

- **Guia completo (instalação, deploy, administração, backup):** [docs/GUIA.md](docs/GUIA.md)
- **Arquitetura e decisões técnicas:** [docs/ARQUITETURA.md](docs/ARQUITETURA.md)

## Tecnologia

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 ·
Supabase (PostgreSQL, Auth, Storage, Realtime) · deploy na Vercel.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm install` | Instala as dependências |
| `npm run dev` | Roda o site em `http://localhost:3000` |
| `npm run build` | Gera a versão de produção |
| `npm test` | Testes das regras (classificação, desempate, suspensões, mata-mata) |
| `npm run typecheck` | Verificação de tipos |
| `npm run admin:create -- email "senha"` | Cria o administrador |
| `PGURL=... npm run db:test` | Aplica as migrations num PostgreSQL vazio e testa o RLS |

## Estrutura

```
supabase/migrations/   banco: tabelas, segurança (RLS), storage, dados iniciais
supabase/tests/        testes de segurança e integridade do banco
src/domain/            regras do torneio (puras e testadas): placar, tabela,
                       estatísticas, suspensões, chaveamento, texto WhatsApp
src/lib/               acesso a dados, autenticação, datas, PDF, imagens
src/actions/           Server Actions do painel (validação + auditoria)
src/app/(public)/      páginas públicas
src/app/admin/         painel administrativo
src/app/api/           imagens para redes sociais, PDF e CSV
src/components/        componentes de interface
```
