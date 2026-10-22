import { Download, ExternalLink, FileText } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { DOCUMENT_CATEGORIES, getDocuments } from "@/lib/data/content";
import { formatCalendarDate } from "@/lib/format";

export const revalidate = 60;
export const metadata: Metadata = { title: "Regulamento e documentos", description: "Regulamento, editais e comunicados oficiais." };

export default async function DocumentsPage() {
  const docs = await getDocuments();
  const groups = Object.entries(DOCUMENT_CATEGORIES)
    .map(([key, label]) => ({ key, label, docs: docs.filter((d) => d.category === key) }))
    .filter((g) => g.docs.length);
  return (
    <>
      <PageHeader title="Regulamento e documentos" eyebrow="Documentos oficiais" />
      <div className="container-page space-y-8 py-8">
        {groups.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum documento publicado">
            O regulamento e os editais serão publicados aqui.
          </EmptyState>
        ) : (
          groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-3 font-display text-2xl font-extrabold uppercase">{g.label}</h2>
              <ul className="space-y-2">
                {g.docs.map((d) => (
                  <li key={d.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <FileText className="hidden size-8 shrink-0 text-accent sm:block" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{d.title}</p>
                      {d.description ? <p className="text-sm text-muted">{d.description}</p> : null}
                      <p className="mt-1 text-xs text-subtle">Publicado em {formatCalendarDate(d.published_on)}</p>
                    </div>
                    <div className="flex gap-2">
                      {d.file_url ? (
                        <>
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                            Visualizar
                          </a>
                          <a href={`${d.file_url}?download=`} className="btn-primary btn-sm">
                            <Download className="size-4" aria-hidden /> Baixar
                          </a>
                        </>
                      ) : null}
                      {d.external_url ? (
                        <a href={d.external_url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                          Abrir link <ExternalLink className="size-4" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
