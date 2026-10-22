// Datas e horários sempre no fuso oficial do torneio, independente do
// fuso do servidor (Vercel roda em UTC) ou do celular de quem acessa.

export const TIME_ZONE = "America/Fortaleza";
const LOCALE = "pt-BR";

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...options });

const dateFmt = fmt({ day: "2-digit", month: "2-digit", year: "numeric" });
const shortDateFmt = fmt({ day: "2-digit", month: "2-digit" });
const timeFmt = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const weekdayFmt = fmt({ weekday: "short" });
const longFmt = fmt({ weekday: "long", day: "2-digit", month: "long" });
const partsFmt = fmt({
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** "02/11/2026" */
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
/** "02/11" */
export const formatShortDate = (iso: string) => shortDateFmt.format(new Date(iso));
/** "19:30" */
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
/** "02/11/2026 às 19:30" */
export const formatDateTime = (iso: string) => `${formatDate(iso)} às ${formatTime(iso)}`;
/** "seg." */
export const formatWeekday = (iso: string) => weekdayFmt.format(new Date(iso));
/** "segunda-feira, 02 de novembro" */
export const formatLongDate = (iso: string) => longFmt.format(new Date(iso));

/** Datas de calendário ("2026-11-02") não têm fuso: só reorganiza. */
export function formatCalendarDate(date: string, withYear = true): string {
  const [y, m, d] = date.split("-");
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

/** Interpreta uma data de calendário como meia-noite no fuso do torneio. */
export function calendarDateToIso(date: string): string {
  return zonedInputToIso(`${date}T00:00`);
}

function zonedParts(date: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Valor para <input type="datetime-local"> no fuso do torneio. */
export function isoToZonedInput(iso: string | null): string {
  if (!iso) return "";
  const p = zonedParts(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Converte "2026-11-02T19:30" (horário do torneio) para ISO em UTC. */
export function zonedInputToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Data inválida: ${value}`);
  const [, y, mo, d, h, mi] = match.map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Descobre o deslocamento do fuso nesse instante e corrige.
  const p = zonedParts(new Date(asUtc));
  const zonedAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return new Date(asUtc - (zonedAsUtc - asUtc)).toISOString();
}

/** Data de hoje no fuso do torneio ("2026-11-02"). */
export function todayInTournament(now = new Date()): string {
  return isoToZonedInput(now.toISOString()).slice(0, 10);
}

export function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
