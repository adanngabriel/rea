import {
  BookOpen,
  CalendarDays,
  CalendarX2,
  GitBranch,
  Medal,
  Shield,
  Shirt,
  Table2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { qualificationMarks } from "@/domain/bracket";
import { indexSnapshot } from "@/domain/snapshot";
import { countdownTarget, featuredMatch, finishedMatches, orderedMatches, upcomingMatches } from "@/domain/schedule";
import { computeStandings } from "@/domain/standings";
import { computePlayerStats, leaderboard } from "@/domain/stats";
import { AwardCard, tournamentPrizes } from "@/components/public/award-card";
import { Countdown } from "@/components/public/countdown";
import { FeaturedMatch } from "@/components/public/featured-match";
import { MatchCarousel } from "@/components/public/match-carousel";
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

// Atalhos do celular: só o que se procura com frequência; o resto está no menu.
const SHORTCUTS = [
  { href: "/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/classificacao", label: "Classificação", icon: Table2 },
  { href: "/times", label: "Times", icon: Shield },
  { href: "/premiacoes", label: "Premiações", icon: Medal },
  { href: "/mata-mata", label: "Mata-mata", icon: GitBranch },
  { href: "/documentos", label: "Regulamento", icon: BookOpen },
  { href: "/sorteio", label: "Sorteio", icon: Shirt },
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
  // O destaque desliza pelos jogos da mesma rodada, começando no jogo da vez.
  const roundMatches = featured ? orderedMatches(s).filter((m) => m.status !== "cancelled" && (featured.round_id ? m.round_id === featured.round_id : m.id === featured.id)) : [];
  const upcoming = upcomingMatches(s).filter((m) => !roundMatches.includes(m)).slice(0, 4);
  const prizes = tournamentPrizes(s.awards);
  const ix = indexSnapshot(s);
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
        <div className="nerazzurri absolute inset-0 opacity-70" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" aria-hidden />
        <div className="container-page relative py-7 sm:py-20">
          <h1 className="max-w-3xl font-display text-[2.6rem] font-extrabold uppercase leading-[0.9] sm:text-7xl lg:text-8xl">
            {edition.name}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-ink/80 sm:mt-4 sm:text-lg">
            {edition.venue ? <span>{edition.venue}</span> : null}
            {edition.venue && dates ? <span className="text-accent" aria-hidden>•</span> : null}
            {dates ? <span className="tabular">{dates}</span> : null}
          </p>
          <div className="mt-6 hidden flex-wrap gap-3 sm:flex">
            <Link href="/jogos" className="btn-primary">
              Tabela de jogos
            </Link>
            <Link href="/classificacao" className="btn-secondary">
              Classificação
            </Link>
          </div>
        </div>
      </section>

      {/* Atalhos rápidos no celular: rolam para o lado, logo abaixo do topo. */}
      <nav aria-label="Atalhos" className="border-b border-line sm:hidden">
        <ul className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {SHORTCUTS.map(({ href, label, icon: Icon }) => (
            <li key={href} className="shrink-0">
              <Link href={href} className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold active:scale-95 active:bg-surface-2">
                <Icon className="size-4 text-accent" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container-page space-y-10 py-6 sm:space-y-12 sm:py-12">
        {/* Antes do torneio a contagem é o destaque; depois, o jogo da vez. */}
        {!featured && countdown ? <Countdown target={countdown.at} kind={countdown.kind} /> : null}
        {featured ? (
          <MatchCarousel start={roundMatches.indexOf(featured)} label="Jogos da rodada">
            {roundMatches.map((m) => (
              <FeaturedMatch key={m.id} s={s} match={m} next={m.id === featured.id} />
            ))}
          </MatchCarousel>
        ) : (
          <EmptyState icon={CalendarX2} title="Agenda em breve" compact>
            Os confrontos e horários serão divulgados pela organização.
          </EmptyState>
        )}
        {featured && countdown ? <Countdown target={countdown.at} kind={countdown.kind} /> : null}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
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
          {results.length ? (
          <section>
            <SectionHeader title="Destaques" href="/estatisticas" />
            <div className="rail sm:grid-cols-2 lg:grid-cols-1">
              <HighlightCard label="Artilheiro" entry={scorer?.entry} value={scorer?.value} unit="gols" empty="Nenhum gol registrado ainda." />
              <HighlightCard label="Líder em assistências" entry={assister?.entry} value={assister?.value} unit="assist." empty="Nenhuma assistência registrada." />
              <HighlightCard label="Mais vezes craque do jogo" entry={mvp?.entry} value={mvp?.value} unit="MVPs" empty="Nenhum craque do jogo escolhido." />
              <HighlightCard label="Líder do torneio" team={leaderRow?.team} value={leaderRow?.points} unit="pontos" empty="A competição ainda não começou." />
            </div>
          </section>
          ) : null}
        </div>

        {prizes.length ? (
          <section>
            <SectionHeader title="Premiações" href="/premiacoes" />
            <ul className="rail sm:grid-cols-2 lg:grid-cols-3">
              {prizes.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <AwardCard award={a} ix={ix} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {results.length ? (
          <section>
            <SectionHeader title="Últimos resultados" href="/jogos?status=encerrados" />
            <div className="rail sm:grid-cols-2 lg:grid-cols-4">
              {results.map((m) => (
                <MatchCard key={m.id} s={s} match={m} />
              ))}
            </div>
          </section>
        ) : null}

        {upcoming.length ? (
          <section>
            <SectionHeader title="Próximos jogos" href="/jogos" />
            <div className="rail sm:grid-cols-2 lg:grid-cols-4">
              {upcoming.map((m) => (
                <MatchCard key={m.id} s={s} match={m} />
              ))}
            </div>
          </section>
        ) : null}

        {news.length ? (
          <section>
            <SectionHeader title="Notícias e comunicados" href="/noticias" />
            <div className="rail md:grid-cols-3">
              {news.map((n) => (
                <NewsCard key={n.id} item={n} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
