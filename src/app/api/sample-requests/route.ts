import { NextResponse } from "next/server";
import { apiErrorResponse, invalidJsonResponse, readJsonPayload } from "../../../server/api";
import { createSampleRequest, searchSampleRequests } from "../../../server/samples";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const sampleRequests = await searchSampleRequests({
      q: searchParams.get("q"),
      status: searchParams.get("status"),
      customerId: searchParams.get("customerId"),
      fabricId: searchParams.get("fabricId"),
      limit: searchParams.get("limit"),
    });

    return NextResponse.json({ sampleRequests });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const payload = await readJsonPayload(request);
  if (payload === null) return invalidJsonResponse();

  try {
    const sampleRequest = await createSampleRequest(payload);
    return NextResponse.json({ sampleRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
