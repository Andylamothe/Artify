import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, COOKIE_OPTIONS, SOCIAL_AUTH_COOKIE } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { name, email, password, role = "viewer" } = await req.json();

  if (!name || !email || !password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const users = db.users.getAll();
  if (users.find((u) => u.email === email))
    return NextResponse.json({ error: "Email already used" }, { status: 400 });

  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
    role,
    createdAt: new Date().toISOString(),
  };

  db.users.save([...users, { ...user, password: await bcrypt.hash(password, 10) }]);

  const token = await signToken(user.id, user.role);
  const res = NextResponse.json({ user }, { status: 201 });
  res.cookies.set(SOCIAL_AUTH_COOKIE, token, COOKIE_OPTIONS);
  return res;
}
