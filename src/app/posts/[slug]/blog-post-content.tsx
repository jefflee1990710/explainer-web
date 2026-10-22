import type { ReactNode } from "react";

// Render inline Markdown formatting (bold, italic, inline code, links).
function renderInline(text: string): ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-zinc-900">
          {part.slice(2, -2)}
        </strong>
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
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600"
        >
          {label}
        </a>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// Render Markdown or plain text blocks cleanly for the blog post detail view.
export function BlogPostContent({ content }: { content: string }) {
  const blocks = content.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="space-y-5 text-base leading-relaxed text-zinc-700">
      {blocks.map((rawBlock, idx) => {
        const block = rawBlock.trim();
        if (!block) return null;

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

        const lines = block.split("\n");
        if (lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
          return (
            <ul key={idx} className="list-disc space-y-1.5 pl-6">
              {lines.map((line, itemIdx) => (
                <li key={itemIdx}>{renderInline(line.trim().replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-line">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
