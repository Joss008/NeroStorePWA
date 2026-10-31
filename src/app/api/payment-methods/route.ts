import { NextResponse } from "next/server";
import {
  getPaymentMethodsState,
  setPaymentMethodsState,
  type PaymentMethodRecord,
} from "@/lib/server/db";

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
    const data = await getPaymentMethodsState();
    return NextResponse.json(data, {
      headers: { ...corsHeaders, "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    return NextResponse.json(
      { methods: [], updatedAt: 0, error: String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const methods: PaymentMethodRecord[] = Array.isArray(body.methods) ? body.methods : [];
    const saved = await setPaymentMethodsState(methods);
    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
}
