import { query } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const admin = getUserFromToken(req);
    if (!admin || admin.role !== "Admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { attendanceId } = await req.json();

    if (!attendanceId) {
      return NextResponse.json({ error: "Attendance ID is required" }, { status: 400 });
    }

    // Update attendance record to approved
    await query(
      `UPDATE Attendance SET
        IsApproved = 1,
        ApprovalStatus = 'Approved',
        ApprovedBy = @param0,
        ApprovedAt = GETDATE()
       WHERE Id = @param1`,
      [admin.userId, attendanceId]
    );

    return NextResponse.json({ message: "Attendance approved successfully" });
  } catch (error) {
    console.error("Approval error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
