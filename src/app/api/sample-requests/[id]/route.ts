import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../../server/api";
import { getSampleRequest, updateSampleRequest } from "../../../../server/samples";

export const runtime = "nodejs";

type SampleRequestRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: SampleRequestRouteContext) {
  try {
    const { id } = await context.params;
    const sampleRequest = await getSampleRequest(id);
    return NextResponse.json({ sampleRequest });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: SampleRequestRouteContext) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const { id } = await context.params;
    const sampleRequest = await updateSampleRequest(id, payload);
    return NextResponse.json({ sampleRequest });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
