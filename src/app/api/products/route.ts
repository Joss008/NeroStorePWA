import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getDataFilePath() {
  const possiblePaths = [
    path.join(process.cwd(), "blox-products-override.json"),
    path.join(process.cwd(), "..", "blox-products-override.json"),
    path.join("C:", "Users", "Jeff", "Desktop", "BLOX", "blox-products-override.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join("C:", "Users", "Jeff", "Desktop", "BLOX", "blox-products-override.json");
}

function readData() {
  const filePath = getDataFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading shared products override:", err);
  }
  return { custom: [], hidden: [], updatedAt: Date.now() };
}

function writeData(data: { custom: unknown[]; hidden: string[]; updatedAt?: number }) {
  const filePath = getDataFilePath();
  try {
    const payload = {
      ...data,
      updatedAt: Date.now(),
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    return payload;
  } catch (err) {
    console.error("Error writing shared products override:", err);
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET() {
  const data = readData();
  return NextResponse.json(data, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const custom = Array.isArray(body.custom) ? body.custom : [];
    const hidden = Array.isArray(body.hidden) ? body.hidden : [];
    const saved = writeData({ custom, hidden });
    return NextResponse.json(saved || { ok: false }, {
      headers: corsHeaders,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
}
