// Turn a post title or custom slug into a URL-safe SEO slug.
export function slugifyBlogPost(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    // Keep letters, numbers, and CJK characters; turn spaces/punctuation into hyphens
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || `post-${Date.now()}`;
}

// Create a short plain-text summary from Markdown/HTML content when excerpt is omitted.
export function derivePostExcerpt(content: string, maxLength = 160): string {
  const plain = content
    // Remove markdown images and links keeping link text
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Remove headings, blockquotes, code fences, inline emphasis
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}
