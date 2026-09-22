import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../../server/api";
import { updateSampleRequestStatus } from "../../../../../server/samples";

export const runtime = "nodejs";

type SampleStatusRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: SampleStatusRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const sampleRequest = await updateSampleRequestStatus(id, payload);
    return NextResponse.json({ sampleRequest });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
