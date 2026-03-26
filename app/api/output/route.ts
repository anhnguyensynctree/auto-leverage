import { NextResponse } from "next/server";
import { getTemplate } from "@/lib/output-templates";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("components" in body) ||
    !Array.isArray((body as Record<string, unknown>).components) ||
    (body as { components: unknown[] }).components.length === 0
  ) {
    return NextResponse.json(
      { data: null, error: "components must be a non-empty array" },
      { status: 400 },
    );
  }

  const { components } = body as { components: string[] };

  const template = getTemplate(components);

  if (!template) {
    return NextResponse.json(
      { data: null, error: "Unknown component combination" },
      { status: 400 },
    );
  }

  return NextResponse.json({ data: template, error: null });
}
