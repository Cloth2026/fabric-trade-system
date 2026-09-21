import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../../server/api";
import { createCustomerContact, listCustomerContacts } from "../../../../../server/customers";

export const runtime = "nodejs";

type CustomerContactsRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: CustomerContactsRouteContext) {
  try {
    const { id } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const contacts = await listCustomerContacts(id, {
      q: searchParams.get("q"),
      status: searchParams.get("status"),
      limit: searchParams.get("limit"),
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: CustomerContactsRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const contact = await createCustomerContact(id, payload);
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
