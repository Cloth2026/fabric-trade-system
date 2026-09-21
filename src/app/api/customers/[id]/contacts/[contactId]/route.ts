import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../../../server/api";
import { getCustomerContact, updateCustomerContact } from "../../../../../../server/customers";

export const runtime = "nodejs";

type CustomerContactRouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function GET(_request: Request, context: CustomerContactRouteContext) {
  try {
    const { contactId } = await context.params;
    const contact = await getCustomerContact(contactId);
    return NextResponse.json({ contact });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: CustomerContactRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { contactId } = await context.params;
    const contact = await updateCustomerContact(contactId, payload);
    return NextResponse.json({ contact });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
