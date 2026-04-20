import { NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * GET /api/qr?content=<URL or text>&size=<int>
 *
 * Returns a PNG QR code. No auth — content is provided by the caller, so
 * we cap the length to prevent abuse and skip rate limiting (not a hot
 * endpoint). Use for printing table QR cards.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const content = url.searchParams.get("content");
  const sizeStr = url.searchParams.get("size") ?? "256";
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "content too long" }, { status: 400 });
  const size = Math.min(Math.max(parseInt(sizeStr, 10) || 256, 64), 1024);

  const buffer = await QRCode.toBuffer(content, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
