# AG VPN — site

Landing page do AG VPN em Next.js (App Router) e TypeScript, com tema roxo.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Requer Node.js 20.9 ou superior.

## Estrutura

- `app/page.tsx`: seções e textos da página (recursos, plataformas, passos, planos, FAQ)
- `app/globals.css`: estilos; as cores ficam nas variáveis `--purple-*` em `:root`
- `components/`: `Header` (menu responsivo), `ConnectCard` (demonstração do app), `Logo`
- `public/icon.svg`: favicon

## Antes de publicar

- Troque os links `#` dos downloads e do rodapé pelos endereços reais.
- Confira se preços, números (países, plataformas) e promessas (sem registros,
  kill switch, WireGuard) correspondem ao produto de verdade.
- O `ConnectCard` é só visual: não cria nenhuma conexão.
