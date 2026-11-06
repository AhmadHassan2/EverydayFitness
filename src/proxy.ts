import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/proxy-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets, icons, the manifest and the service worker.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
