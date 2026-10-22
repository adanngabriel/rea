import { Download, FileSpreadsheet, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { CopyTextButton } from "@/components/public/share-button";
import { buildShareText, type ShareSection } from "@/domain/share-text";
import { adminSnapshot } from "@/lib/data/admin";
import { qrSvg } from "@/lib/qr";
import { siteUrl } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Exportações" };

const SECTIONS: { key: ShareSection; label: string }[] = [
  { key: "standings", label: "Classificação" },
  { key: "results", label: "Últimos resultados" },
  { key: "upcoming", label: "Próximos jogos" },
  { key: "scorers", label: "Artilharia" },
];

export default async function ExportsPage({ searchParams }: { searchParams: Promise<{ secoes?: string; rodada?: string }> }) {
  const params = await searchParams;
  const s = await adminSnapshot();
  const chosen = (params.secoes?.split(",").filter((x) => SECTIONS.some((s) => s.key === x)) as ShareSection[] | undefined) ?? ["standings", "upcoming"];
  const text = buildShareText(s, chosen, siteUrl());
  const roundId = s.rounds.some((r) => r.id === params.rodada) ? params.rodada! : (s.rounds[0]?.id ?? "");
  const qr = await qrSvg(siteUrl());
  const cards = [
    { key: "classificacao", label: "Classificação", query: "" },
    { key: "confrontos", label: "Confrontos da rodada", query: roundId ? `&rodada=${roundId}` : "" },
    { key: "resultados", label: "Resultados da rodada", query: roundId ? `&rodada=${roundId}` : "" },
    { key: "artilharia", label: "Artilharia", query: "" },
  ];
  return (
    <>
      <AdminPageTitle title="Exportações" description="Imagens prontas para Instagram e WhatsApp, PDF, planilhas e texto — tudo gerado com os dados atuais." />
      <div className="space-y-8">
        <section className="card space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-extrabold uppercase">Imagens para redes sociais</h2>
            <form className="flex items-end gap-2">
              <label>
                <span className="field-label text-xs">Rodada (confrontos/resultados)</span>
                <select name="rodada" defaultValue={roundId} className="input py-2 text-sm">
                  {s.rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-secondary btn-sm" type="submit">Aplicar</button>
            </form>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c) => (
              <div key={c.key} className="space-y-2">
                <p className="text-sm font-semibold">{c.label}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/cards/${c.key}?formato=feed${c.query}`} alt={`Prévia: ${c.label}`} className="aspect-[4/5] w-full rounded-xl border border-line bg-surface-2 object-cover" loading="lazy" />
                <div className="flex flex-wrap gap-2">
                  <a className="btn-primary btn-sm" href={`/api/cards/${c.key}?formato=feed${c.query}`} download={`${c.key}-feed.png`}>
                    <Download className="size-4" aria-hidden /> Feed 4:5
                  </a>
                  <a className="btn-secondary btn-sm" href={`/api/cards/${c.key}?formato=story${c.query}`} download={`${c.key}-story.png`}>
                    <Download className="size-4" aria-hidden /> Story 9:16
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="font-display text-xl font-extrabold uppercase">Texto para WhatsApp</h2>
          <form className="flex flex-wrap items-center gap-4 text-sm">
            {SECTIONS.map((sec) => (
              <label key={sec.key} className="inline-flex items-center gap-2">
                <input type="checkbox" name="secao" value={sec.key} defaultChecked={chosen.includes(sec.key)} className="size-4 accent-[var(--color-accent)]" />
                {sec.label}
              </label>
            ))}
            <WhatsSectionsSubmit />
          </form>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-bg p-4 text-sm">{text}</pre>
          <CopyTextButton text={text} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="card space-y-3 p-5">
            <h2 className="font-display text-xl font-extrabold uppercase">PDF</h2>
            <p className="text-sm text-muted">Classificação, jogos, resultados e artilharia.</p>
            <a href="/api/relatorio" target="_blank" className="btn-primary btn-sm">
              <FileText className="size-4" aria-hidden /> Gerar relatório
            </a>
            <p className="text-xs text-muted">A súmula de cada jogo está na página da partida.</p>
          </div>
          <div className="card space-y-3 p-5">
            <h2 className="font-display text-xl font-extrabold uppercase">Planilhas (CSV)</h2>
            <div className="flex flex-wrap gap-2">
              {[
                ["classificacao", "Classificação"],
                ["jogos", "Jogos"],
                ["jogadores", "Jogadores e estatísticas"],
              ].map(([k, l]) => (
                <a key={k} href={`/api/csv/${k}`} className="btn-secondary btn-sm">
                  <FileSpreadsheet className="size-4" aria-hidden /> {l}
                </a>
              ))}
            </div>
            <p className="text-xs text-muted">Abre no Excel ou Google Planilhas.</p>
          </div>
          <div className="card flex flex-col items-center gap-3 p-5 text-center">
            <h2 className="font-display text-xl font-extrabold uppercase">QR Code do site</h2>
            <div className="w-40 rounded-xl bg-white p-2" role="img" aria-label={`QR Code para ${siteUrl()}`} dangerouslySetInnerHTML={{ __html: qr }} />
            <a className="btn-secondary btn-sm" href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} download="qrcode-pelada-do-caps.svg">
              <Download className="size-4" aria-hidden /> Baixar QR Code
            </a>
            <Link href="/sobre" target="_blank" className="text-xs text-accent underline">Também na página Sobre</Link>
          </div>
        </section>
      </div>
    </>
  );
}

/** Junta as caixas marcadas no parâmetro ?secoes=a,b (sem JavaScript extra). */
function WhatsSectionsSubmit() {
  return (
    <button className="btn-secondary btn-sm" type="submit" formAction="/admin/exportacoes/texto">
      Atualizar texto
    </button>
  );
}
