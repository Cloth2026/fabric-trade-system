import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../../server/api";
import { createSupplierUnit, listSupplierUnits } from "../../../../../server/suppliers";

export const runtime = "nodejs";

type SupplierUnitsRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: SupplierUnitsRouteContext) {
  try {
    const { id } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const units = await listSupplierUnits(id, {
      q: searchParams.get("q"),
      unitForm: searchParams.get("unitForm"),
      businessType: searchParams.get("businessType"),
      status: searchParams.get("status"),
      limit: searchParams.get("limit"),
    });
    return NextResponse.json({ units });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: SupplierUnitsRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const unit = await createSupplierUnit(id, payload);
    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
