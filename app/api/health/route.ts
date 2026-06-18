import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "Xtractify",
    status: "ok",
    runtime: "nextjs",
  });
}
