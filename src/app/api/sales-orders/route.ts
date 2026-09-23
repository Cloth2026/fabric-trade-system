import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../server/api";
import { createSalesOrder, searchSalesOrders } from "../../../server/sales-orders";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const salesOrders = await searchSalesOrders({
      q: searchParams.get("q"),
      status: searchParams.get("status"),
      customerId: searchParams.get("customerId"),
      fabricId: searchParams.get("fabricId"),
      deliveryStatus: searchParams.get("deliveryStatus"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      limit: searchParams.get("limit"),
    });

    return NextResponse.json({ salesOrders });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const salesOrder = await createSalesOrder(payload);
    return NextResponse.json({ salesOrder }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
