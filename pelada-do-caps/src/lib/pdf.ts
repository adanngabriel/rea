import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

// Relatórios em PDF (A4) com as fontes padrão do PDF, que cobrem os
// acentos do português. Layout simples em colunas com quebra de página.

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 42;
const INK = rgb(0.07, 0.09, 0.08);
const MUTED = rgb(0.42, 0.47, 0.44);
const ACCENT = rgb(0.35, 0.55, 0.05);
const LINE = rgb(0.85, 0.87, 0.86);

/** Remove caracteres fora do WinAnsi (ex.: emojis) para não quebrar o PDF. */
const safe = (t: string) => t.replace(/[^\x20-\x7E -ÿ–—•…×]/g, "");

export interface Column {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
}

export class PdfReport {
  private constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
    private title: string,
  ) {}
  private page!: PDFPage;
  private y = 0;

  static async create(title: string): Promise<PdfReport> {
    const doc = await PDFDocument.create();
    doc.setTitle(title);
    doc.setLanguage("pt-BR");
    const r = new PdfReport(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold), title);
    r.newPage();
    return r;
  }

  private newPage() {
    this.page = this.doc.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN;
    this.page.drawText(safe(this.title), { x: MARGIN, y: this.y - 10, size: 9, font: this.regular, color: MUTED });
    this.y -= 28;
  }

  private ensure(height: number) {
    if (this.y - height < MARGIN + 20) this.newPage();
  }

  heading(text: string, size = 18) {
    this.ensure(size + 16);
    this.y -= size;
    this.page.drawText(safe(text), { x: MARGIN, y: this.y, size, font: this.bold, color: INK });
    this.y -= 10;
  }

  text(text: string, { size = 10, bold = false, color = INK }: { size?: number; bold?: boolean; color?: typeof INK } = {}) {
    const font = bold ? this.bold : this.regular;
    const maxWidth = A4.width - MARGIN * 2;
    const words = safe(text).split(/\s+/);
    let line = "";
    const flush = () => {
      this.ensure(size + 4);
      this.y -= size + 3;
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font, color });
      line = "";
    };
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        flush();
        line = w;
      } else line = next;
    }
    if (line) flush();
  }

  muted(text: string) {
    this.text(text, { size: 9, color: MUTED });
  }

  gap(h = 10) {
    this.y -= h;
  }

  table(columns: Column[], rows: (string | number)[][]) {
    const size = 9.5;
    const rowH = 17;
    const draw = (cells: (string | number)[], font: PDFFont, color = INK) => {
      this.ensure(rowH);
      this.y -= rowH;
      let x = MARGIN;
      columns.forEach((c, i) => {
        let t = safe(String(cells[i] ?? ""));
        while (t.length > 1 && font.widthOfTextAtSize(t, size) > c.width - 6) t = `${t.slice(0, -2)}…`;
        const w = font.widthOfTextAtSize(t, size);
        const tx = c.align === "right" ? x + c.width - w - 4 : c.align === "center" ? x + (c.width - w) / 2 : x + 2;
        this.page.drawText(t, { x: tx, y: this.y + 5, size, font, color });
        x += c.width;
      });
      this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: A4.width - MARGIN, y: this.y }, thickness: 0.5, color: LINE });
    };
    draw(columns.map((c) => c.label), this.bold, ACCENT);
    for (const r of rows) draw(r, this.regular);
    this.gap(8);
  }

  async bytes(): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => p.drawText(`${i + 1}/${pages.length}`, { x: A4.width - MARGIN - 20, y: MARGIN - 18, size: 8, font: this.regular, color: MUTED }));
    return this.doc.save();
  }
}

export function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
