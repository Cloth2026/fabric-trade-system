import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../server/api";
import { getCustomerQuote, updateCustomerQuote } from "../../../../server/customer-quotes";

export const runtime = "nodejs";

type CustomerQuoteRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: CustomerQuoteRouteContext) {
  try {
    const { id } = await context.params;
    const customerQuote = await getCustomerQuote(id);
    return NextResponse.json({ customerQuote });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: CustomerQuoteRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const customerQuote = await updateCustomerQuote(id, payload);
    return NextResponse.json({ customerQuote });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
