import { NextResponse } from "next/server";
import { listPublishedBlogPosts } from "@/service/blog-post/blog-posts";
import { PLANS } from "@/service/billing/plans";
import { getSiteUrl } from "@/util/app-url";

// Build the concise `llms.txt` markdown document following the llms.txt standard.
export function buildLlmsTxt(
  siteUrl: string,
  posts: Array<{ slug: string; title: string; excerpt: string }> = [],
): string {
  const recentPostsSection =
    posts.length > 0
      ? [
          "## Recent Articles & Guides",
          "",
          ...posts.slice(0, 20).map((post) => {
            const url = `${siteUrl}/posts/${encodeURIComponent(post.slug)}`;
            const summary = post.excerpt ? `: ${post.excerpt}` : "";
            return `- [${post.title}](${url})${summary}`;
          }),
          "",
        ]
      : [];

  return [
    "# Scro",
    "",
    "> Scro is an AI Influencer & Explainer Video Studio that lets creators, founders, SMEs, and agencies build virtual KOLs with a locked face, root-anchored custom wardrobe, cloned voice across 21 languages (including Hong Kong Cantonese), daily Life feed photos, storyboarded short-form videos, and a built-in multi-track video editor.",
    "",
    `Full LLM documentation is available at [${siteUrl}/llms-full.txt](${siteUrl}/llms-full.txt).`,
    "",
    "## Core Pages",
    "",
    `- [Home](${siteUrl}/): Overview of Scro's AI Influencer Soul Studio, identity lock, custom wardrobe, Life feed, and AI storyboard director.`,
    `- [AI Influencer Studio](${siteUrl}/ai-influencer): Build a virtual KOL with locked facial identity, custom wardrobe looks, voice cloning across 21 languages, and daily social posts.`,
    `- [Product Promo & UGC Videos](${siteUrl}/product-promo): Upload real product photos and let a virtual host pitch them in scroll-stopping UGC shorts while keeping packaging 100% authentic.`,
    `- [Talking-Head Videos](${siteUrl}/talking-head): Pick an AI Influencer outfit, paste a script, and generate lip-synced talking-head clips with artistic captions.`,
    `- [Hong Kong Cantonese Video Studio](${siteUrl}/cantonese): Authentic Cantonese talking-head and product explainer videos tailored for Hong Kong SMEs and solo founders.`,
    `- [Whiteboard Explainer Videos](${siteUrl}/explainer): Turn complex product concepts into clear 30–60s whiteboard doodle and vector explainer shorts.`,
    `- [Pick the Right AI Video Tool](${siteUrl}/right-tool): Compare DIY prompting vs. Scro's end-to-end AI director, keyframe approval, and built-in timeline editor.`,
    `- [Use Cases & Examples](${siteUrl}/examples): Finished vertical Reels (9:16), presentation deck clips (16:9), square product ads (1:1), and wide stage stories.`,
    `- [Pricing & Plans](${siteUrl}/pricing): Monthly subscription tiers (Starter $${PLANS.starter.amountUsd}/mo, Pro $${PLANS.pro.amountUsd}/mo, Studio $${PLANS.studio.amountUsd}/mo, Scale $${PLANS.scale.amountUsd}/mo) and Enterprise custom plans.`,
    `- [Posts & Guides](${siteUrl}/posts): Tutorials, product updates, and playbooks on AI Influencers, short-form video marketing, and creative workflows.`,
    `- [Scro Academy](${siteUrl}/academy): Free courses that teach registered members how to create Reels that grow a business and a following.`,
    `- [Contact](${siteUrl}/contact): Customer support (cs@thenovax.com) and enterprise sales inquiries.`,
    "",
    ...recentPostsSection,
    "## Developer & AI Agent Integration (MCP & REST API)",
    "",
    `- [MCP Endpoint](${siteUrl}/api/mcp): Model Context Protocol (MCP) HTTP endpoint authenticated via \`Authorization: Bearer exp_live_*\` API keys.`,
    `- [REST API v1](${siteUrl}/api/v1): Programmatic access to folders, videos, characters, styles, directors, custom wardrobe, Life photos, and blog posts.`,
    "",
    "## Optional",
    "",
    `- [Terms of Service](${siteUrl}/terms): Platform terms, credit usage policies, and content licensing.`,
    `- [Privacy Policy](${siteUrl}/privacy): Data collection, Firebase authentication, Stripe billing, and privacy practices.`,
    `- [Sitemap](${siteUrl}/sitemap.xml): XML sitemap of all public pages and published articles.`,
    "",
  ].join("\n");
}

// Build the comprehensive `llms-full.txt` markdown document with deep product details, workflows, pricing, and MCP capabilities.
export function buildLlmsFullTxt(
  siteUrl: string,
  posts: Array<{
    slug: string;
    title: string;
    excerpt: string;
    tags?: string[];
    updatedAt?: string;
  }> = [],
): string {
  const postsList =
    posts.length > 0
      ? posts
          .map((post) => {
            const url = `${siteUrl}/posts/${encodeURIComponent(post.slug)}`;
            const tags = post.tags && post.tags.length > 0 ? ` [${post.tags.join(", ")}]` : "";
            return `- [${post.title}](${url})${tags} — ${post.excerpt}`;
          })
          .join("\n")
      : "- Visit " + `${siteUrl}/posts` + " for the latest published articles.";

  return [
    "# Scro — Full Documentation for LLMs & AI Agents",
    "",
    "> Scro (`https://scro.io`) is an all-in-one AI Influencer, Virtual KOL, and Explainer Video Production Studio. It combines character identity locking, custom wardrobe management, 21-language voice cloning (with first-class Hong Kong Cantonese support), AI storyboard directing, keyframe-first video generation, and a built-in multi-track timeline editor.",
    "",
    "---",
    "",
    "## 1. What Problem Scro Solves",
    "",
    "Traditional video production requires cameras, lighting, actors, and expensive retakes. Raw AI video playgrounds burn credits on blind retries because they lack character consistency, storyboard planning, and post-production editing.",
    "",
    "Scro solves this with a structured **Approve-Before-Render** pipeline:",
    "1. **Inject a Soul into Your AI Influencer**: Create a virtual character blueprint with a locked face, persona (city, personality, tone, pace, humor), custom wardrobe outfits, and cloned voice.",
    "2. **Plan with Built-in AI Directors**: Choose specialized AI directors (Talking-Head, Whiteboard Explainer, Product Demo, Listicle, Step-by-Step Tutorial, Short Film, Outfit Reel) that write hooks, visual beats, and narration.",
    "3. **Approve Keyframe Stills First**: Preview and revise start/end keyframes at low credit cost before committing credits to full video rendering.",
    "4. **Finish in the Built-in Timeline Editor**: Auto-trim leading/trailing silence with 15ms audio micro-fades, apply 13 artistic subtitle presets with bilingual Google Fonts, insert 1-click Stock B-Roll cutaways, layer sound effects and music, and export 9:16 Reels, 16:9 presentations, or 1:1 feed posts.",
    "",
    "---",
    "",
    "## 2. Key Product Capabilities",
    "",
    "### 2.1 AI Influencer & Character Studio (`/ai-influencer`)",
    "- **Identity Lock**: Root-anchored character blueprints keep facial identity 100% consistent from v1 to v10 across outfits, poses, and video clips.",
    "- **Custom Wardrobe**: Mix and match curated tops, pants, shoes, dresses, and accessories, or upload custom fashion items you own to build a recognizable brand IP.",
    "- **Voice Cloning (21 Languages)**: Record directly in the browser with a built-in teleprompter or upload voice clips. Supports Hong Kong Cantonese (`zh-HK`), Mandarin (`zh-TW`, `zh-CN`), English, Japanese, Korean, Spanish, French, German, Portuguese, Russian, Indonesian, and more.",
    "- **Life Feed Generator**: Place your AI Influencer into real-world locations (cafés, streets, studios, travel spots) with pose control to publish daily social stills.",
    "",
    "### 2.2 Product Promo & UGC Videos (`/product-promo`)",
    "- **Authentic Product Preservation**: Upload real product packaging or item photos; Scro keeps logos and product geometry authentic while placing your virtual host in everyday or extreme scenes (studios, night markets, icebergs, Mars).",
    "- **High-Converting Hooks**: Structured around buyer pain points → product reveal → features in use → call to action.",
    "",
    "### 2.3 Captioned Talking-Head Videos (`/talking-head`)",
    "- **Script-to-Lip-Sync**: Select a character and outfit, paste the script, and generate lip-synced talking-head clips.",
    "- **Artistic Subtitles**: 13 editable caption presets with bilingual Google Fonts rendered directly on the timeline.",
    "",
    "### 2.4 Hong Kong Cantonese for SMEs (`/cantonese`)",
    "- **Built for Local Businesses**: Designed for Hong Kong shop owners, solo founders, and SMEs who need natural Cantonese speaking pitch videos without hiring an agency or appearing on camera.",
    "- **Local Scenes & Tone**: Supports authentic colloquial Cantonese scripts, local shop settings, and bilingual subtitles.",
    "",
    "### 2.5 Whiteboard & Visual Explainer Videos (`/explainer`)",
    "- **Concept Breakdowns**: Pairs the Explainer Director with Whiteboard Doodle, Flat Vector, Claymation, Pixel Art, or Cinematic styles.",
    "- **Readable on Mute**: Diagrams, visual metaphors, and one clear idea per clip for sales decks, client emails, and social feeds.",
    "",
    "---",
    "",
    "## 3. Pricing & Plans (`/pricing`)",
    "",
    "Storyboard drafting is free before approval. Credits are spent only when generating character blueprints, Life photos, keyframe stills, or rendered video clips.",
    "",
    `- **Starter** ($${PLANS.starter.amountUsd}/month): ${PLANS.starter.monthlyCredits.toLocaleString("en-US")} monthly credits — ideal for testing Scro and solo creators.`,
    `- **Pro** ($${PLANS.pro.amountUsd}/month): ${PLANS.pro.monthlyCredits.toLocaleString("en-US")} monthly credits — for business owners publishing regular shorts and Life posts.`,
    `- **Studio** ($${PLANS.studio.amountUsd}/month, Most Popular): ${PLANS.studio.monthlyCredits.toLocaleString("en-US")} monthly credits — for creators and freelancers producing client videos.`,
    `- **Scale** ($${PLANS.scale.amountUsd}/month): ${PLANS.scale.monthlyCredits.toLocaleString("en-US")} monthly credits — for agencies and multi-account teams.`,
    "- **Enterprise**: Custom monthly credits, invoice billing, dedicated support, and volume agreements (`hello@explainer.io`).",
    "",
    "---",
    "",
    "## 4. Model Context Protocol (MCP) & API Integration",
    "",
    "Scro provides a first-party **Model Context Protocol (MCP)** server so AI agents (Claude Desktop, Cursor, custom MCP clients) can inspect accounts, manage characters and wardrobes, draft storyboards, and trigger renders.",
    "",
    "- **MCP Endpoint**: `POST " + `${siteUrl}/api/mcp` + "`",
    "- **Authentication**: `Authorization: Bearer exp_live_<key>` (generated in the Scro Studio under `/app/mcp`).",
    "- **Available MCP Tools**:",
    "  - Account & Workspace: `get_account`, `list_folders`, `create_folder`, `list_styles`",
    "  - Characters & Wardrobe: `list_characters`, `get_character`, `create_character`, wardrobe outfit and look tools, Life photo generation tools",
    "  - Video Production: `list_videos`, `get_video`, `create_video`, `revise_storyboard`, `approve_storyboard`, `generate_clip_frames`, `generate_clip_video`, `generate_remaining`",
    "  - Post-Production & Editing: Reel assembly, subtitle styling, and timeline editing tools",
    "",
    "---",
    "",
    "## 5. Public URLs & Navigation Map",
    "",
    `- Home: ${siteUrl}/`,
    `- AI Influencer: ${siteUrl}/ai-influencer`,
    `- Product Promo: ${siteUrl}/product-promo`,
    `- Talking Head: ${siteUrl}/talking-head`,
    `- Hong Kong Cantonese: ${siteUrl}/cantonese`,
    `- Whiteboard Explainer: ${siteUrl}/explainer`,
    `- Right Tool Comparison: ${siteUrl}/right-tool`,
    `- Examples & Use Cases: ${siteUrl}/examples`,
    `- Pricing: ${siteUrl}/pricing`,
    `- Posts & Articles: ${siteUrl}/posts`,
    `- Scro Academy: ${siteUrl}/academy`,
    `- Contact: ${siteUrl}/contact`,
    `- Terms of Service: ${siteUrl}/terms`,
    `- Privacy Policy: ${siteUrl}/privacy`,
    `- XML Sitemap: ${siteUrl}/sitemap.xml`,
    "",
    "---",
    "",
    "## 6. Published Posts & Guides",
    "",
    postsList,
    "",
    "---",
    "",
    "## 7. Contact & Support",
    "",
    "- **Website**: " + siteUrl,
    "- **Customer Support**: cs@thenovax.com",
    "- **Enterprise Sales**: hello@explainer.io",
    "",
  ].join("\n");
}

// Serve a plain-text Markdown response with caching headers for LLM crawlers.
export async function serveLlmsMarkdown(full: boolean): Promise<NextResponse> {
  const siteUrl = getSiteUrl();
  let posts: Awaited<ReturnType<typeof listPublishedBlogPosts>> = [];

  try {
    posts = await listPublishedBlogPosts(100);
  } catch (error) {
    console.warn("llms.txt: failed to load blog posts", error);
  }

  const body = full ? buildLlmsFullTxt(siteUrl, posts) : buildLlmsTxt(siteUrl, posts);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
