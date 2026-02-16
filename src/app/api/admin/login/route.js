import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query } from "@/lib/prisma";
import bcrypt from 'bcryptjs';

export async function POST(req) {
  const { email, password } = await req.json();

  if (email !== "Bunny" || password !== "Ved@123#") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const admin = await query(
    "SELECT Id, Role FROM Users WHERE Username = @param0",
    [email]
  );

  let adminUser;
  if (!admin.length) {
    // Create admin user if not exists
    const hashedPassword = await bcrypt.hash("Ved@123#", 10);
    await query(
      "INSERT INTO Users (Username, PasswordHash, Role, FullName) VALUES (@param0, @param1, @param2, @param3)",
      [email, hashedPassword, "Admin", "Administrator"]
    );
    
    // Get the created admin user
    const newAdmin = await query(
      "SELECT Id, Role FROM Users WHERE Username = @param0",
      [email]
    );
    adminUser = newAdmin[0];
  } else {
    adminUser = admin[0];
  }

  if (adminUser.Role !== "Admin") {
    return NextResponse.json({ error: "Admin not found" }, { status: 403 });
  }

  const token = jwt.sign(
    {
      userId: adminUser.Id,
      role: "Admin"
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return NextResponse.json({ token });
}