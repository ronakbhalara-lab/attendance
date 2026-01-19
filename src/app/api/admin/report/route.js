import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query } from "@/lib/prisma";

export async function GET(req) {
  try {
    /* ================= AUTH ================= */
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header missing" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (decoded.role !== "Admin") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    /* ================= QUERY PARAM ================= */
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId"); // optional

    /* ================= DB QUERY ================= */
    let sql = `
      SELECT 
        a.Id,
        a.UserId,
        a.ClockInTime,
        a.ClockOutTime,
        a.ClockInLat,
        a.ClockInLocation,
        a.ClockInLng,
        a.ClockOutLat,
        a.ClockOutLocation,
        a.ClockOutLng,
        a.SelfieIn,
        a.SelfieOut,
        a.CreatedAt,
        a.IsLate,
        a.IsApproved,
        a.ApprovalStatus,
        a.ApprovalMessage,
        a.ApprovedBy,
        a.ApprovedAt,
        u.FullName,
        u.Username
      FROM Attendance a
      INNER JOIN Users u ON a.UserId = u.Id
    `;

    const params = [];

    if (userId) {
      sql += ` WHERE a.UserId = ?`;
      params.push(userId);
    }

    sql += ` ORDER BY a.CreatedAt DESC`;

    const data = await query(sql, params);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin Report API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
