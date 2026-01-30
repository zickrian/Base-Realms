export function slug(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "section";
}

export type DocSection = { slug: string; title: string; content: string };

export function getSections(content: string): DocSection[] {
  const blocks = content.split(/\n## /);
  const sections: DocSection[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block.trim()) continue;

    if (i === 0) {
      const firstLine = block.split("\n")[0];
      const title = firstLine.replace(/^#\s*/, "").trim();
      sections.push({
        slug: slug(title),
        title,
        content: block.trim(),
      });
    } else {
      const firstNewline = block.indexOf("\n");
      const title = firstNewline === -1 ? block.trim() : block.slice(0, firstNewline).trim();
      const body = firstNewline === -1 ? "" : block.slice(firstNewline + 1).trim();
      sections.push({
        slug: slug(title),
        title,
        content: `## ${title}\n\n${body}`,
      });
    }
  }

  return sections;
}

export type TocItem = { level: number; text: string; id: string };

export function parseToc(md: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = md.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = slug(text);
      items.push({ level, text, id });
    }
  }
  return items;
}
