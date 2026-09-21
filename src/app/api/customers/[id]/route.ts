import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../server/api";
import { getCustomer, updateCustomer } from "../../../../server/customers";

export const runtime = "nodejs";

type CustomerRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: CustomerRouteContext) {
  try {
    const { id } = await context.params;
    const customer = await getCustomer(id);
    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: CustomerRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const customer = await updateCustomer(id, payload);
    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
