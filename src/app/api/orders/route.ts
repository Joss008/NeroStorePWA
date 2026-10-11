import { NextResponse } from "next/server";
import { listOrders, insertOrder, updateOrderStatus } from "@/lib/server/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    let orders = await listOrders();
    if (phone) {
      orders = orders.filter((o) => {
        const user = o.user as { phone?: string } | undefined;
        return user?.phone === phone;
      });
    }
    return NextResponse.json(orders, {
      headers: { ...corsHeaders, "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.code || !body?.user || !Array.isArray(body?.items)) {
      return NextResponse.json({ error: "Invalid order payload" }, { status: 400, headers: corsHeaders });
    }
    await insertOrder(body);
    return NextResponse.json(body, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const code = String(body?.code || "");
    const status = String(body?.status || "");
    if (!code || !status) {
      return NextResponse.json({ error: "code and status required" }, { status: 400, headers: corsHeaders });
    }
    const updated = await updateOrderStatus(code, status);
    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404, headers: corsHeaders });
    }
    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
}
