import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse } from "../../../../server/api";
import { getFabricDetail } from "../../../../server/fabrics/read-fabrics";
import { updateFabric } from "../../../../server/fabrics/update-fabric";

export const runtime = "nodejs";

type FabricRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: FabricRouteContext) {
  try {
    const { id } = await context.params;
    const fabric = await getFabricDetail(id);
    return NextResponse.json({ data: fabric });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: FabricRouteContext) {
  try {
    const payload = await request.json().catch(() => null);

    if (payload === null) {
      return invalidJsonResponse();
    }

    const { id } = await context.params;
    const fabric = await updateFabric(id, payload);

    return NextResponse.json({ data: fabric });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
