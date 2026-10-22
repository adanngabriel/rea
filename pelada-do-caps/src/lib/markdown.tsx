import { Fragment, type ReactNode } from "react";

// Markdown mínimo para notícias (títulos, listas, citações, negrito,
// itálico e links). Gera elementos React — nunca HTML bruto — então o
// texto do painel não consegue injetar scripts.

const SAFE_URL = /^(https?:\/\/|mailto:|\/)/i;

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g;
  let last = 0;
  let i = 0;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1]) out.push(<strong key={key}>{inline(m[1], key)}</strong>);
    else if (m[2]) out.push(<em key={key}>{inline(m[2], key)}</em>);
    else if (m[3] && SAFE_URL.test(m[4])) {
      const external = /^https?:/i.test(m[4]);
      out.push(
        <a key={key} href={m[4]} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {m[3]}
        </a>,
      );
    } else if (m[5]) {
      out.push(
        <a key={key} href={m[5]} target="_blank" rel="noopener noreferrer">
          {m[5]}
        </a>,
      );
    } else out.push(m[0]);
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    const k = `b${blocks.length}`;
    if (paragraph.length) {
      blocks.push(
        <p key={k}>
          {paragraph.map((l, i) => (
            <Fragment key={i}>
              {i > 0 ? <br /> : null}
              {inline(l, `${k}-${i}`)}
            </Fragment>
          ))}
        </p>,
      );
      paragraph = [];
    }
    if (list) {
      const Tag = list.ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={`${k}l`}>
          {list.items.map((item, i) => (
            <li key={i}>{inline(item, `${k}l${i}`)}</li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      const H = heading[1].length === 2 ? "h2" : "h3";
      blocks.push(<H key={`h${blocks.length}`}>{inline(heading[2], `h${blocks.length}`)}</H>);
    } else if (bullet || numbered) {
      if (paragraph.length) flush();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (quote) {
      flush();
      blocks.push(<blockquote key={`q${blocks.length}`}>{inline(quote[1], `q${blocks.length}`)}</blockquote>);
    } else {
      if (list) flush();
      paragraph.push(line);
    }
  }
  flush();
  return <div className="prose-news">{blocks}</div>;
}
