import { brandIcon } from "@/lib/brand-icon";

const FILES = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
} as const;

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: RouteContext<"/icons/[file]">) {
  const { file } = await params;
  const spec = FILES[file as keyof typeof FILES];
  if (!spec) return new Response("Not found", { status: 404 });
  return brandIcon(spec.size, { maskable: spec.maskable });
}
