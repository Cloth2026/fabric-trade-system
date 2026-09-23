import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../../server/api";
import { updateSalesOrderStatus } from "../../../../../server/sales-orders";

export const runtime = "nodejs";

type SalesOrderStatusRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: SalesOrderStatusRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const salesOrder = await updateSalesOrderStatus(id, payload);
    return NextResponse.json({ salesOrder });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
