import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const payload = await verifyToken(req);
  if (!payload)
    return NextResponse.json({ user: null });

  const record = db.users.getAll().find((u) => u.id === payload.userId);
  if (!record)
    return NextResponse.json({ user: null });

  const { password: _, ...user } = record;
  return NextResponse.json({ user });
}
