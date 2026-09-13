import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAppError } from "../../../server/errors";
import { searchSuppliers } from "../../../server/suppliers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q");
    const limit = Number(request.nextUrl.searchParams.get("limit"));
    const suppliers = await searchSuppliers({ q, limit });

    return NextResponse.json({ suppliers });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
