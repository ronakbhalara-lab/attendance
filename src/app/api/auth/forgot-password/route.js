import { query } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { username, newPassword } = await req.json();

    if (!username || !newPassword) {
      return NextResponse.json({ error: "Username and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    // Find user by username
    const users = await query(
      'SELECT Id, Username FROM Users WHERE Username = @param0',
      [username]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password directly
    await query(
      'UPDATE Users SET PasswordHash = @param0 WHERE Id = @param1',
      [hashedPassword, user.Id]
    );

    return NextResponse.json({ 
      message: "Password updated successfully! You can now login with your new password."
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
