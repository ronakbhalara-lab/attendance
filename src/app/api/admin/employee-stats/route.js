import { query } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    // Verify admin authentication
    const user = getUserFromToken(req);
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get comprehensive statistics for the employee
    let stats;
    try {
      stats = await query(`
        SELECT 
          COUNT(*) as TotalDays,
          COUNT(CASE WHEN IsLate = 1 OR IsLate = 'true' THEN 1 END) as LateArrivals,
          COUNT(CASE WHEN EarlyClockOut = 1 OR EarlyClockOut = 'true' THEN 1 END) as EarlyDepartures,
          COUNT(CASE WHEN IsApproved = 1 OR IsApproved = 'true' THEN 1 END) as ApprovedEntries,
          COUNT(CASE WHEN IsApproved = 0 OR IsApproved = 'false' THEN 1 END) as PendingApprovals,
          COUNT(CASE WHEN IsSystemCheckout = 1 OR IsSystemCheckout = 'true' THEN 1 END) as SystemCheckouts,
          COUNT(CASE WHEN ClockOutTime IS NOT NULL THEN 1 END) as CompletedDays,
          COUNT(CASE WHEN ClockOutTime IS NULL THEN 1 END) as IncompleteDays,
          MIN(ClockInTime) as FirstClockIn,
          MAX(ClockInTime) as LastClockIn
        FROM Attendance 
        WHERE UserId = @param0
      `, [userId]);
    } catch (error) {
      // If IsSystemCheckout column doesn't exist, fallback query without it
      console.log('IsSystemCheckout column not found, using fallback query');
      stats = await query(`
        SELECT 
          COUNT(*) as TotalDays,
          COUNT(CASE WHEN IsLate = 1 OR IsLate = 'true' THEN 1 END) as LateArrivals,
          COUNT(CASE WHEN EarlyClockOut = 1 OR EarlyClockOut = 'true' THEN 1 END) as EarlyDepartures,
          COUNT(CASE WHEN IsApproved = 1 OR IsApproved = 'true' THEN 1 END) as ApprovedEntries,
          COUNT(CASE WHEN IsApproved = 0 OR IsApproved = 'false' THEN 1 END) as PendingApprovals,
          0 as SystemCheckouts,
          COUNT(CASE WHEN ClockOutTime IS NOT NULL THEN 1 END) as CompletedDays,
          COUNT(CASE WHEN ClockOutTime IS NULL THEN 1 END) as IncompleteDays,
          MIN(ClockInTime) as FirstClockIn,
          MAX(ClockInTime) as LastClockIn
        FROM Attendance 
        WHERE UserId = @param0
      `, [userId]);
    }

    // Get monthly statistics for the current year
    let monthlyStats;
    try {
      monthlyStats = await query(`
        SELECT 
          FORMAT(ClockInTime, 'yyyy-MM') as Month,
          COUNT(*) as TotalDays,
          COUNT(CASE WHEN IsLate = 1 OR IsLate = 'true' THEN 1 END) as LateArrivals,
          COUNT(CASE WHEN EarlyClockOut = 1 OR EarlyClockOut = 'true' THEN 1 END) as EarlyDepartures,
          COUNT(CASE WHEN IsApproved = 1 OR IsApproved = 'true' THEN 1 END) as ApprovedEntries,
          COUNT(CASE WHEN IsApproved = 0 OR IsApproved = 'false' THEN 1 END) as PendingApprovals,
          COUNT(CASE WHEN IsSystemCheckout = 1 OR IsSystemCheckout = 'true' THEN 1 END) as SystemCheckouts
        FROM Attendance 
        WHERE UserId = @param0 
          AND YEAR(ClockInTime) = YEAR(GETDATE())
        GROUP BY FORMAT(ClockInTime, 'yyyy-MM')
        ORDER BY Month
      `, [userId]);
    } catch (error) {
      console.log('IsSystemCheckout column not found in monthly stats, using fallback');
      monthlyStats = await query(`
        SELECT 
          FORMAT(ClockInTime, 'yyyy-MM') as Month,
          COUNT(*) as TotalDays,
          COUNT(CASE WHEN IsLate = 1 OR IsLate = 'true' THEN 1 END) as LateArrivals,
          COUNT(CASE WHEN EarlyClockOut = 1 OR EarlyClockOut = 'true' THEN 1 END) as EarlyDepartures,
          COUNT(CASE WHEN IsApproved = 1 OR IsApproved = 'true' THEN 1 END) as ApprovedEntries,
          COUNT(CASE WHEN IsApproved = 0 OR IsApproved = 'false' THEN 1 END) as PendingApprovals,
          0 as SystemCheckouts
        FROM Attendance 
        WHERE UserId = @param0 
          AND YEAR(ClockInTime) = YEAR(GETDATE())
        GROUP BY FORMAT(ClockInTime, 'yyyy-MM')
        ORDER BY Month
      `, [userId]);
    }

    // Get recent pending approvals
    const pendingApprovals = await query(`
      SELECT TOP 5
        Id,
        ClockInTime,
        ClockOutTime,
        IsLate,
        LateClockInReason,
        EarlyClockOut,
        EarlyClockOutReason,
        ApprovalStatus,
        ApprovalMessage
      FROM Attendance 
      WHERE UserId = @param0 AND (IsApproved = 0 OR IsApproved = 'false')
      ORDER BY ClockInTime DESC
    `, [userId]);

    // Get recent system checkouts
    let systemCheckouts;
    try {
      systemCheckouts = await query(`
        SELECT TOP 5
          Id,
          ClockInTime,
          ClockOutTime,
          ClockInLocation,
          ClockOutLocation
        FROM Attendance 
        WHERE UserId = @param0 AND IsSystemCheckout = 1
        ORDER BY ClockInTime DESC
      `, [userId]);
    } catch (error) {
      console.log('IsSystemCheckout column not found in system checkouts query');
      systemCheckouts = [];
    }

    return NextResponse.json({
      summary: stats[0] || {},
      monthlyStats: monthlyStats || [],
      pendingApprovals: pendingApprovals || [],
      systemCheckouts: systemCheckouts || []
    });

  } catch (error) {
    console.error('Employee stats error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}
