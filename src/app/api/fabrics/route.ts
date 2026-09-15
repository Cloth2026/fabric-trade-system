import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError, isUniqueConstraintError } from "../../../server/errors";
import { createFabric } from "../../../server/fabrics/create-fabric";
import { listFabrics } from "../../../server/fabrics/read-fabrics";

export const runtime = "nodejs";

export function errorResponse(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }

  if (isUniqueConstraintError(error)) {
    return NextResponse.json({ error: "Resource already exists." }, { status: 409 });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request payload.", details: error.issues }, { status: 400 });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const result = await listFabrics({
      q: searchParams.get("q"),
      fabricType: searchParams.get("fabricType"),
      status: searchParams.get("status"),
      developmentSource: searchParams.get("developmentSource"),
      completeness: searchParams.get("completeness"),
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const fabric = await createFabric(payload);

    return NextResponse.json({ fabric }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
