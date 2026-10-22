/** URL de incorporação para vídeos do YouTube; outros links abrem fora. */
export function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (u.hostname.endsWith("youtube.com")) id = u.searchParams.get("v") ?? u.pathname.match(/\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] ?? null;
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
