import { NextResponse } from "next/server";
import { isAppError, isUniqueConstraintError } from "./errors";

export async function readJsonPayload(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function apiErrorResponse(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }

  if (isUniqueConstraintError(error)) {
    return NextResponse.json({ error: "Resource already exists." }, { status: 409 });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export function invalidJsonResponse() {
  return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
}
