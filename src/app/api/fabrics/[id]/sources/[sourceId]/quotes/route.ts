import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse } from "../../../../../../../server/api";
import { addFabricSourceQuote } from "../../../../../../../server/fabrics/source-quotes";

export const runtime = "nodejs";

type FabricSourceQuotesRouteContext = {
  params: Promise<{ id: string; sourceId: string }>;
};

export async function POST(request: Request, context: FabricSourceQuotesRouteContext) {
  try {
    const payload = await request.json().catch(() => null);

    if (payload === null) {
      return invalidJsonResponse();
    }

    const { id, sourceId } = await context.params;
    const fabric = await addFabricSourceQuote(id, sourceId, payload);

    return NextResponse.json({ data: fabric }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
