import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../server/api";
import { getSupplierUnit, updateSupplierUnit } from "../../../../server/suppliers";

export const runtime = "nodejs";

type SupplierUnitRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: SupplierUnitRouteContext) {
  try {
    const { id } = await context.params;
    const unit = await getSupplierUnit(id);
    return NextResponse.json({ unit });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: SupplierUnitRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const unit = await updateSupplierUnit(id, payload);
    return NextResponse.json({ unit });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
