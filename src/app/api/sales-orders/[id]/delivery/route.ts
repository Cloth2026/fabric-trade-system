import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../../server/api";
import { updateSalesOrderDelivery } from "../../../../../server/sales-orders";

export const runtime = "nodejs";

type SalesOrderDeliveryRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: SalesOrderDeliveryRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const salesOrder = await updateSalesOrderDelivery(id, payload);
    return NextResponse.json({ salesOrder });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
