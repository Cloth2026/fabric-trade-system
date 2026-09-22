import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../../server/api";
import { updateCustomerQuoteStatus } from "../../../../../server/customer-quotes";

export const runtime = "nodejs";

type CustomerQuoteStatusRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: CustomerQuoteStatusRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const customerQuote = await updateCustomerQuoteStatus(id, payload);
    return NextResponse.json({ customerQuote });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
