import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../server/api";
import { createCustomerQuote, searchCustomerQuotes } from "../../../server/customer-quotes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const customerQuotes = await searchCustomerQuotes({
      q: searchParams.get("q"),
      status: searchParams.get("status"),
      customerId: searchParams.get("customerId"),
      fabricId: searchParams.get("fabricId"),
      overdue: searchParams.get("overdue"),
      limit: searchParams.get("limit"),
    });

    return NextResponse.json({ customerQuotes });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const customerQuote = await createCustomerQuote(payload);
    return NextResponse.json({ customerQuote }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
