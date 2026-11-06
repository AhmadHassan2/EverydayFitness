import { ImageResponse } from "next/og";

/**
 * App mark: an open progress ring on a near-black tile. Rendered at request
 * time (and cached) so there are no binary icon files to keep in sync.
 */
export function brandIcon(size: number, { maskable = false, rounded = false } = {}) {
  // Maskable icons keep the mark inside the central 80% safe zone.
  const ring = Math.round(size * (maskable ? 0.46 : 0.58));
  const stroke = Math.max(2, Math.round(ring * 0.15));
  const r = (ring - stroke) / 2;
  const c = 2 * Math.PI * r;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ring}" height="${ring}" viewBox="0 0 ${ring} ${ring}"><circle cx="${ring / 2}" cy="${ring / 2}" r="${r}" fill="none" stroke="#2a2a28" stroke-width="${stroke}"/><circle cx="${ring / 2}" cy="${ring / 2}" r="${r}" fill="none" stroke="#34c06b" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c * 0.72} ${c}" transform="rotate(-90 ${ring / 2} ${ring / 2})"/></svg>`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0c0c",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" width={ring} height={ring} src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} />
      </div>
    ),
    { width: size, height: size },
  );
}
