import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/openFoodFacts";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? undefined;
  const category = sp.get("category") ?? undefined;
  const page = Number(sp.get("page") ?? "1") || 1;
  const pageSize = Number(sp.get("pageSize") ?? "24") || 24;

  const result = await searchProducts({ q, category, page, pageSize });
  if (result.error) {
    return NextResponse.json(
      { ...result.data, error: result.error },
      { status: 503 },
    );
  }
  return NextResponse.json(result.data);
}
