import { NextResponse, type NextRequest } from "next/server";

/** Private, on-device mode has no account or server session to refresh. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  return NextResponse.next({ request });
}
