import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../../../../server/api";
import { updateSampleItemFeedback } from "../../../../../../../server/samples";

export const runtime = "nodejs";

type SampleFeedbackRouteContext = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, context: SampleFeedbackRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id, itemId } = await context.params;
    const item = await updateSampleItemFeedback(id, itemId, payload);
    return NextResponse.json({ item });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
