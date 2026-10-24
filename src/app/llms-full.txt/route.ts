import { serveLlmsMarkdown } from "@/presentation/api/llms/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return serveLlmsMarkdown(true);
}
