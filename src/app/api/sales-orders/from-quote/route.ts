import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../server/api";
import { createSalesOrderFromQuote } from "../../../../server/sales-orders";

export const runtime = "nodejs";

// Turning an accepted quote into a draft order. Static route wins over
// /api/sales-orders/[id].
export async function POST(request: Request) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const salesOrder = await createSalesOrderFromQuote(payload);
    return NextResponse.json({ salesOrder }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
