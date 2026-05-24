import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { isArtProfile } from "@/lib/artProfile";

export async function PATCH(req: NextRequest) {
  const payload = await verifyToken(req);
  if (!payload) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { artProfile } = await req.json();
  if (!isArtProfile(artProfile)) {
    return NextResponse.json({ error: "Invalid art profile" }, { status: 400 });
  }

  const users = db.users.getAll();
  const index = users.findIndex((u) => u.id === payload.userId);
  if (index === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  users[index] = { ...users[index], artProfile };
  db.users.save(users);

  const { password: _, ...user } = users[index];
  return NextResponse.json({ user });
}
