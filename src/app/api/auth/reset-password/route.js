import { query } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    // Find user with valid reset token
    const users = await query(
      'SELECT Id, Username FROM Users WHERE PasswordResetToken = @param0 AND PasswordResetExpiry > @param1',
      [token, new Date()]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await query(
      'UPDATE Users SET PasswordHash = @param0, PasswordResetToken = NULL, PasswordResetExpiry = NULL WHERE Id = @param1',
      [hashedPassword, user.Id]
    );

    return NextResponse.json({ 
      message: "Password reset successful" 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
