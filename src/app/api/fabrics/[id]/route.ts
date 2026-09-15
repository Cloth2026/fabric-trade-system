import { NextResponse } from "next/server";
import { apiErrorResponse } from "../../../../server/api";
import { getFabricDetail } from "../../../../server/fabrics/read-fabrics";

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
