import { query } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const user = getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await query(
      'SELECT * FROM Attendance WHERE UserId = @param0 ORDER BY ClockInTime DESC',
      [user.userId]
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Attendance report error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
