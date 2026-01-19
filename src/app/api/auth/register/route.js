import { query } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const fullName = formData.get("fullName");
    const username = formData.get("username");
    const password = formData.get("password");
    const profilePhoto = formData.get("profilePhoto");

    if (!fullName || !username || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await query(
      'SELECT Id FROM Users WHERE Username = @param0',
      [username]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    // Handle profile photo if provided
    let photoPath = null;
    if (profilePhoto) {
      const bytes = await profilePhoto.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = Date.now() + "_" + profilePhoto.name;
      photoPath = "/uploads/" + fileName;
      
      // Here you would save the file to disk
      // For now, just store the path
    }

    await query(
      'INSERT INTO Users (FullName, Username, PasswordHash, Role) VALUES (@param0, @param1, @param2, @param3)',
      [fullName, username, hash, 'User']
    );

    return NextResponse.json({ 
      message: "User Created",
      profilePhoto: photoPath 
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
