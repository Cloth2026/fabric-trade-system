import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "../../../server/errors";
import { createFabric } from "../../../server/fabrics/create-fabric";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request payload.", details: error.issues }, { status: 400 });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const fabric = await createFabric(payload);

    return NextResponse.json({ fabric }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
