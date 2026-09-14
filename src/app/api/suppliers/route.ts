import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../server/api";
import { createSupplier, searchSuppliers } from "../../../server/suppliers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const suppliers = await searchSuppliers({
      q: searchParams.get("q"),
      role: searchParams.get("role"),
      status: searchParams.get("status"),
      limit: searchParams.get("limit"),
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const supplier = await createSupplier(payload);
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
