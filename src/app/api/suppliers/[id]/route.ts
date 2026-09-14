import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../server/api";
import { getSupplier, updateSupplier } from "../../../../server/suppliers";

export const runtime = "nodejs";

type SupplierRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: SupplierRouteContext) {
  try {
    const { id } = await context.params;
    const supplier = await getSupplier(id);
    return NextResponse.json({ supplier });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: SupplierRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const supplier = await updateSupplier(id, payload);
    return NextResponse.json({ supplier });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
