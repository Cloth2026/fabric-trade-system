import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../server/api";
import { getSalesOrder, updateSalesOrder } from "../../../../server/sales-orders";

export const runtime = "nodejs";

type SalesOrderRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: SalesOrderRouteContext) {
  try {
    const { id } = await context.params;
    const salesOrder = await getSalesOrder(id);
    return NextResponse.json({ salesOrder });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: SalesOrderRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const salesOrder = await updateSalesOrder(id, payload);
    return NextResponse.json({ salesOrder });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
