import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse } from "../../../../../../server/api";
import { updateFabricSource } from "../../../../../../server/fabrics/source-quotes";

export const runtime = "nodejs";

type FabricSourceRouteContext = {
  params: Promise<{ id: string; sourceId: string }>;
};

export async function PATCH(request: Request, context: FabricSourceRouteContext) {
  try {
    const payload = await request.json().catch(() => null);

    if (payload === null) {
      return invalidJsonResponse();
    }

    const { id, sourceId } = await context.params;
    const fabric = await updateFabricSource(id, sourceId, payload);

    return NextResponse.json({ data: fabric });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
