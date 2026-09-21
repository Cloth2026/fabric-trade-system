import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../server/api";
import { createCustomer, searchCustomers } from "../../../server/customers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const customers = await searchCustomers({
      q: searchParams.get("q"),
      type: searchParams.get("type"),
      level: searchParams.get("level"),
      status: searchParams.get("status"),
      limit: searchParams.get("limit"),
    });

    return NextResponse.json({ customers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const customer = await createCustomer(payload);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
