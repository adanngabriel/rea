import {
  BookOpen,
  CalendarDays,
  CalendarX2,
  Flag,
  GitBranch,
  Images,
  Newspaper,
  Shield,
  Shirt,
  Square,
  Table2,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { qualificationMarks } from "@/domain/bracket";
import { countdownTarget, featuredMatch, finishedMatches, upcomingMatches } from "@/domain/schedule";
import { computeStandings } from "@/domain/standings";
import { computePlayerStats, leaderboard } from "@/domain/stats";
import { Countdown } from "@/components/public/countdown";
import { FeaturedMatch } from "@/components/public/featured-match";
import { HighlightCard } from "@/components/public/highlight-card";
import { LiveRefresher } from "@/components/public/live-refresher";
import { MatchCard } from "@/components/public/match-card";
import { NewsCard } from "@/components/public/news-card";
import { QualificationLegend, StandingsTable } from "@/components/public/standings-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section";
import { getNews } from "@/lib/data/content";
import { currentSnapshot } from "@/lib/data/require";
import { formatCalendarDate } from "@/lib/format";

export const revalidate = 60;

const SHORTCUTS = [
  { href: "/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/classificacao", label: "Classificação", icon: Table2 },
  { href: "/times", label: "Times", icon: Shield },
  { href: "/jogadores", label: "Jogadores", icon: Users },
  { href: "/estatisticas", label: "Estatísticas", icon: Trophy },
  { href: "/mata-mata", label: "Mata-mata", icon: GitBranch },
  { href: "/cartoes", label: "Cartões", icon: Square },
  { href: "/documentos", label: "Regulamento", icon: BookOpen },
  { href: "/noticias", label: "Notícias", icon: Newspaper },
  { href: "/sorteio", label: "Sorteio", icon: Shirt },
  { href: "/galeria", label: "Galeria", icon: Images },
  { href: "/campeao", label: "Campeão", icon: Flag },
];

export default async function HomePage() {
  const [s, news] = await Promise.all([currentSnapshot(), getNews(3)]);
  const featured = featuredMatch(s);
  const countdown = countdownTarget(s);
  const standings = computeStandings(s.teams, s.matches, s.events, s.rules);
  const marks = qualificationMarks(s.rules.knockout.slots);
  const stats = computePlayerStats(s);
  const scorer = leaderboard(s, "goals", stats)[0];
  const assister = leaderboard(s, "assists", stats)[0];
  const mvp = leaderboard(s, "mvp", stats)[0];
  const leaderRow = standings.find((r) => r.played > 0) ? standings[0] : null;
  const results = finishedMatches(s).slice(0, 4);
  const upcoming = upcomingMatches(s).filter((m) => m.id !== featured?.id).slice(0, 4);
  const { edition } = s;
  const dates =
    edition.starts_on && edition.ends_on
      ? `${formatCalendarDate(edition.starts_on, false)} a ${formatCalendarDate(edition.ends_on)}`
      : null;

  return (
    <>
      <LiveRefresher tables={["matches", "match_events"]} pollSeconds={featured?.status === "live" ? 45 : 0} />
      <section className="relative overflow-hidden border-b border-line">
        {edition.hero_image_url ? (
          <Image src={edition.hero_image_url} alt="" fill priority sizes="100vw" className="object-cover opacity-30" />
        ) : null}
        <div className="pitch-lines absolute inset-0" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" aria-hidden />
        <div className="container-page relative py-12 sm:py-20">
          <p className="eyebrow mb-3 text-accent">{edition.season ? `Temporada ${edition.season}` : "Torneio oficial"}</p>
          <h1 className="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl lg:text-8xl">
            {edition.name}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-ink/80">
            {edition.venue ? <span>{edition.venue}</span> : null}
            {edition.venue && dates ? <span className="text-accent" aria-hidden>•</span> : null}
            {dates ? <span className="tabular">{dates}</span> : null}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/jogos" className="btn-primary">
              Tabela de jogos
            </Link>
            <Link href="/classificacao" className="btn-secondary">
              Classificação
            </Link>
          </div>
        </div>
      </section>

      <div className="container-page space-y-12 py-8 sm:py-12">
        {featured ? (
          <FeaturedMatch s={s} match={featured} />
        ) : (
          <EmptyState icon={CalendarX2} title="Agenda em breve" compact>
            Os confrontos e horários serão divulgados pela organização.
          </EmptyState>
        )}

        {countdown ? <Countdown target={countdown.at} kind={countdown.kind} /> : null}

        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <section aria-labelledby="h-classificacao">
            <SectionHeader title="Classificação" href="/classificacao" linkLabel="Completa" />
            <h2 id="h-classificacao" className="sr-only">
              Classificação resumida
            </h2>
            {standings.length ? (
              <>
                <StandingsTable rows={standings} marks={marks} compact />
                <QualificationLegend marks={marks} />
              </>
            ) : (
              <EmptyState icon={Shield} title="Times em breve" compact>
                Os times serão divulgados em breve.
              </EmptyState>
            )}
          </section>
          <section>
            <SectionHeader title="Destaques" href="/estatisticas" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <HighlightCard label="Artilheiro" entry={scorer?.entry} value={scorer?.value} unit="gols" empty="Nenhum gol registrado ainda." />
              <HighlightCard label="Líder em assistências" entry={assister?.entry} value={assister?.value} unit="assist." empty="Nenhuma assistência registrada." />
              <HighlightCard label="Mais vezes craque do jogo" entry={mvp?.entry} value={mvp?.value} unit="MVPs" empty="Nenhum craque do jogo escolhido." />
              <HighlightCard label="Líder do torneio" team={leaderRow?.team} value={leaderRow?.points} unit="pontos" empty="A competição ainda não começou." />
            </div>
          </section>
        </div>

        <section>
          <SectionHeader title="Últimos resultados" href="/jogos?status=encerrados" />
          {results.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {results.map((m) => (
                <MatchCard key={m.id} s={s} match={m} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Trophy} title="Sem resultados" compact>
              A competição ainda não começou.
            </EmptyState>
          )}
        </section>

        {upcoming.length ? (
          <section>
            <SectionHeader title="Próximos jogos" href="/jogos" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {upcoming.map((m) => (
                <MatchCard key={m.id} s={s} match={m} />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <SectionHeader title="Notícias e comunicados" href="/noticias" />
          {news.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {news.map((n) => (
                <NewsCard key={n.id} item={n} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Newspaper} title="Sem publicações" compact>
              Fique de olho: os comunicados da organização aparecem aqui.
            </EmptyState>
          )}
        </section>

        <section aria-labelledby="h-atalhos">
          <h2 id="h-atalhos" className="sr-only">
            Atalhos
          </h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {SHORTCUTS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="card card-hover flex flex-col items-center gap-2 px-2 py-4 text-center">
                  <Icon className="size-5 text-accent" aria-hidden />
                  <span className="text-xs font-semibold sm:text-sm">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
