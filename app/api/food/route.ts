import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/openFoodFacts";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? undefined;
  const category = sp.get("category") ?? undefined;
  const page = Number(sp.get("page") ?? "1") || 1;
  const pageSize = Number(sp.get("pageSize") ?? "24") || 24;

  const data = await searchProducts({ q, category, page, pageSize });
  return NextResponse.json(data);
}
