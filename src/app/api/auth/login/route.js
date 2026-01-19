import { query } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { email, username, password } = body;

    // Use email if provided, otherwise use username
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: "Email/username and password required" },
        { status: 400 }
      );
    }

    const users = await query(
      'SELECT Id, Username, PasswordHash, Role FROM Users WHERE Username = @param0',
      [loginIdentifier]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = users[0];
    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.Id, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Create response with cookies
    const response = NextResponse.json({
      token,
      userId: user.Id,
      role: user.Role,
      message: "Login successful"
    });

    // Set cookies using NextResponse.cookies
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 1 day
      path: '/'
    });

    response.cookies.set('userId', user.Id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 1 day
      path: '/'
    });

    response.cookies.set('role', user.Role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 1 day
      path: '/'
    });

    return response;
  } catch (err) {
    console.error("LOGIN API ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
