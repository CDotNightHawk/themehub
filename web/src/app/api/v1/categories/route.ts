import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categories";

export function GET() {
  return NextResponse.json({
    categories: CATEGORIES.map((c) => ({
      type: c.type,
      label: c.label,
      group: c.group,
      defaultTarget: c.defaultTarget,
      blurb: c.blurb,
    })),
  });
}
