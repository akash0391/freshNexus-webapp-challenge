import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/openFoodFacts";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ barcode: string }> },
) {
  const { barcode } = await ctx.params;
  const product = await getProduct(barcode);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(product);
}
