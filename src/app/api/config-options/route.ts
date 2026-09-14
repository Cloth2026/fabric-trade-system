import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAppError } from "../../../server/errors";
import { listEnabledConfigOptions } from "../../../server/config-options";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const groups = request.nextUrl.searchParams.get("groups")?.split(",") ?? [];
    const options = await listEnabledConfigOptions(groups);

    return NextResponse.json({ options });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
