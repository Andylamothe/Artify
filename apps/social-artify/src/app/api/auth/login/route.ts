import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, COOKIE_OPTIONS, SOCIAL_AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const record = db.users.getAll().find((u) => u.email === email);
  if (!record || !(await bcrypt.compare(password, record.password)))
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const { password: _, ...user } = record;
  const token = await signToken(user.id, user.role);
  const res = NextResponse.json({ user });
  res.cookies.set(SOCIAL_AUTH_COOKIE, token, COOKIE_OPTIONS);
  return res;
}
