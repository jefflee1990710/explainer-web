import type { ReactNode } from "react";

type TableAlignment = "left" | "center" | "right";

// Render inline Markdown formatting (bold, italic, strikethrough, inline code, links).
function renderInline(text: string): ReactNode[] {
  const tokenRegex =
    /(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-zinc-900">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      return (
        <del key={index} className="text-zinc-500 line-through">
          {renderInline(part.slice(2, -2))}
        </del>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isExternal = /^https?:\/\//i.test(href);
      return (
        <a
          key={index}
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600"
        >
          {renderInline(label)}
        </a>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{renderInline(part.slice(1, -1))}</em>;
    }
    return part;
  });
}

// Split a Markdown table row into individual cell strings.
function parseTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((cell) => cell.trim());
}

// Check if a line is a GFM table delimiter row (e.g. |---|:---:|---:|).
function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|") || !trimmed.includes("-")) return false;
  const cells = parseTableRow(trimmed);
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

// Parse column alignments from a GFM table delimiter row.
function parseTableAlignments(line: string): TableAlignment[] {
  return parseTableRow(line).map((cell) => {
    if (cell.startsWith(":") && cell.endsWith(":")) return "center";
    if (cell.endsWith(":")) return "right";
    return "left";
  });
}

// Check if a block of lines represents a Markdown table.
function isMarkdownTableBlock(lines: string[]): boolean {
  if (lines.length < 2) return false;
  return lines[0].includes("|") && isTableSeparatorLine(lines[1]);
}

// Split Markdown content into logical blocks while keeping fenced code blocks intact.
function tokenizeMarkdownBlocks(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;

  const flushCurrent = () => {
    const joined = current.join("\n").trim();
    if (joined) blocks.push(joined);
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      if (inFence) {
        current.push(line);
        flushCurrent();
        inFence = false;
      } else {
        flushCurrent();
        inFence = true;
        current.push(line);
      }
      continue;
    }

    if (inFence) {
      current.push(line);
      continue;
    }

    if (!trimmed) {
      flushCurrent();
      continue;
    }

    current.push(line);
  }

  flushCurrent();
  return blocks;
}

// Render Markdown (tables, checklists, ordered/unordered lists, headings, quotes, images, code) cleanly,
// with an optional mid-article and end-of-article CTA slot.
export function BlogPostContent({
  content,
  inlineCta,
  bottomCta,
}: {
  content: string;
  inlineCta?: ReactNode;
  bottomCta?: ReactNode;
}) {
  const blocks = tokenizeMarkdownBlocks(content);
  const midCtaIndex =
    inlineCta && blocks.length >= 6
      ? Math.max(2, Math.floor(blocks.length * 0.45))
      : -1;

  return (
    <div className="space-y-5 text-base leading-relaxed text-zinc-700">
      {blocks.map((block, idx) => {
        if (!block) return null;

        const renderedBlock = (() => {
        if (block.startsWith("```") && block.endsWith("```")) {
          const lines = block.split("\n");
          const code = lines.slice(1, -1).join("\n");
          return (
            <pre
              key={idx}
              className="overflow-x-auto rounded-xl bg-zinc-900 p-4 font-mono text-sm text-zinc-100"
            >
              <code>{code}</code>
            </pre>
          );
        }

        if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(block)) {
          return <hr key={idx} className="my-8 border-zinc-200" />;
        }

        const imageMatch = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
          const [, alt, src] = imageMatch;
          return (
            <figure key={idx} className="my-6 overflow-hidden rounded-2xl bg-zinc-100">
              <img src={src} alt={alt} className="h-auto w-full object-cover" />
              {alt ? (
                <figcaption className="px-4 py-2 text-center text-xs text-zinc-500">
                  {alt}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        if (block.startsWith("#### ")) {
          return (
            <h4 key={idx} className="pt-2 text-lg font-semibold tracking-tight text-zinc-900">
              {renderInline(block.slice(5))}
            </h4>
          );
        }

        if (block.startsWith("### ")) {
          return (
            <h3 key={idx} className="pt-3 text-xl font-bold tracking-tight text-zinc-900">
              {renderInline(block.slice(4))}
            </h3>
          );
        }

        if (block.startsWith("## ")) {
          return (
            <h2 key={idx} className="pt-4 text-2xl font-bold tracking-tight text-zinc-900">
              {renderInline(block.slice(3))}
            </h2>
          );
        }

        if (block.startsWith("# ")) {
          return (
            <h2 key={idx} className="pt-4 text-2xl font-bold tracking-tight text-zinc-900">
              {renderInline(block.slice(2))}
            </h2>
          );
        }

        if (block.startsWith("> ")) {
          const quoteText = block
            .split("\n")
            .map((line) => line.replace(/^>\s?/, ""))
            .join(" ");
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-zinc-300 pl-4 italic text-zinc-600"
            >
              {renderInline(quoteText)}
            </blockquote>
          );
        }

        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);

        // Render GFM Markdown table.
        if (isMarkdownTableBlock(lines)) {
          const headers = parseTableRow(lines[0]);
          const alignments = parseTableAlignments(lines[1]);
          const bodyRows = lines.slice(2).map(parseTableRow);

          const alignClass = (colIdx: number) => {
            const align = alignments[colIdx] ?? "left";
            if (align === "center") return "text-center";
            if (align === "right") return "text-right";
            return "text-left";
          };

          return (
            <div
              key={idx}
              className="my-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs"
            >
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    {headers.map((header, colIdx) => (
                      <th
                        key={colIdx}
                        scope="col"
                        className={`px-4 py-3 font-semibold text-zinc-900 ${alignClass(colIdx)}`}
                      >
                        {renderInline(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {bodyRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-zinc-50/70">
                      {headers.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          className={`px-4 py-3 text-zinc-700 ${alignClass(colIdx)}`}
                        >
                          {renderInline(row[colIdx] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // Render task list / checklist items (- [ ] or - [x]).
        if (lines.every((line) => /^[-*]\s+\[([ xX])\]\s+/.test(line))) {
          return (
            <ul key={idx} className="space-y-2 pl-1">
              {lines.map((line, itemIdx) => {
                const match = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
                const checked = match ? match[1].toLowerCase() === "x" : false;
                const itemText = match ? match[2] : line.replace(/^[-*]\s+/, "");
                return (
                  <li key={itemIdx} className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      disabled
                      className="mt-1.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-900"
                    />
                    <span>{renderInline(itemText)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Render unordered list.
        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={idx} className="list-disc space-y-1.5 pl-6">
              {lines.map((line, itemIdx) => (
                <li key={itemIdx}>{renderInline(line.replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        // Render ordered list (1. 2. 3.).
        if (lines.every((line) => /^\d+\.\s+/.test(line))) {
          return (
            <ol key={idx} className="list-decimal space-y-1.5 pl-6">
              {lines.map((line, itemIdx) => (
                <li key={itemIdx}>{renderInline(line.replace(/^\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-line">
            {renderInline(block)}
          </p>
        );
        })();

        if (idx === midCtaIndex && inlineCta) {
          return (
            <div key={`block-with-cta-${idx}`} className="space-y-5">
              {renderedBlock}
              {inlineCta}
            </div>
          );
        }

        return renderedBlock;
      })}
      {bottomCta ? <div className="pt-4">{bottomCta}</div> : null}
    </div>
  );
}
