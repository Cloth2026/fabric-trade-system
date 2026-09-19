import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse } from "../../../../../server/api";
import { addFabricSource } from "../../../../../server/fabrics/source-quotes";

export const runtime = "nodejs";

type FabricSourcesRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: FabricSourcesRouteContext) {
  try {
    const payload = await request.json().catch(() => null);

    if (payload === null) {
      return invalidJsonResponse();
    }

    const { id } = await context.params;
    const fabric = await addFabricSource(id, payload);

    return NextResponse.json({ data: fabric }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
