import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { NewsCard } from "@/components/public/news-card";
import { Chips } from "@/components/ui/chips";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/section";
import { getNews, NEWS_CATEGORIES, type NewsCategory } from "@/lib/data/content";

export const revalidate = 60;
export const metadata: Metadata = { title: "Notícias", description: "Notícias e comunicados oficiais do torneio." };

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams;
  const category = categoria && categoria in NEWS_CATEGORIES ? (categoria as NewsCategory) : null;
  const all = await getNews(100);
  const news = category ? all.filter((n) => n.category === category) : all;
  return (
    <>
      <PageHeader title="Notícias" eyebrow="Comunicados oficiais" />
      <div className="container-page space-y-6 py-8">
        <Chips
          label="Categorias"
          items={[
            { href: "/noticias", label: "Todas", active: !category },
            ...Object.entries(NEWS_CATEGORIES).map(([k, v]) => ({ href: `/noticias?categoria=${k}`, label: v, active: category === k })),
          ]}
        />
        {news.length === 0 ? (
          <EmptyState icon={Newspaper} title="Nada publicado ainda">
            Os comunicados da organização aparecerão aqui.
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {news.map((n, i) => (
              <div key={n.id} className={i === 0 && !category ? "md:col-span-2 lg:col-span-2" : ""}>
                <NewsCard item={n} large={i === 0 && !category} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
