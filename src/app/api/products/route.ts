import { NextResponse } from "next/server";
import { getCatalogState, setCatalogState, type CatalogState } from "@/lib/server/db";
import type { Product } from "@/lib/products";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET() {
  try {
    const data: CatalogState = await getCatalogState();
    return NextResponse.json(data, {
      headers: { ...corsHeaders, "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    return NextResponse.json(
      { custom: [], hidden: [], updatedAt: 0, error: String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const custom: Product[] = Array.isArray(body.custom) ? body.custom : [];
    const hidden: string[] = Array.isArray(body.hidden) ? body.hidden : [];
    const saved = await setCatalogState(custom, hidden);
    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
}
