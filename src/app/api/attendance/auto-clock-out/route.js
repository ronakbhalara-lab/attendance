import { query } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Find all users who are clocked in but haven't clocked out
    const activeAttendance = await query(`
      SELECT Id, UserId, ClockInTime 
      FROM Attendance 
      WHERE ClockOutTime IS NULL 
      AND DATE(ClockInTime) < DATE(@param0)
    `, [new Date()]);

    if (activeAttendance.length === 0) {
      return NextResponse.json({ message: "No active attendance records found" });
    }

    const updatedRecords = [];
    
    for (const record of activeAttendance) {
      // Set clock out time to 12:00 AM of the next day after clock in
      const clockInDate = new Date(record.ClockInTime);
      const nextDay = new Date(clockInDate);
      nextDay.setDate(clockInDate.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0); // Set to 12:00 AM

      await query(`
        UPDATE Attendance 
        SET ClockOutTime = @param0, 
            ClockOutLat = NULL, 
            ClockOutLng = NULL, 
            ClockOutLocation = 'System Auto Clock-Out',
            SelfieOut = NULL,
            IsSystemCheckout = 1
        WHERE Id = @param1
      `, [nextDay, record.Id]);

      updatedRecords.push({
        attendanceId: record.Id,
        userId: record.UserId,
        clockInTime: record.ClockInTime,
        autoClockOutTime: nextDay
      });
    }

    return NextResponse.json({ 
      message: `Auto clock-out completed for ${updatedRecords.length} records`,
      updatedRecords: updatedRecords
    });
  } catch (error) {
    console.error('Auto clock-out error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}

// This endpoint can be called by a cron job or scheduler
export async function GET(req) {
  try {
    // Just return count of active attendance records (for monitoring)
    const activeCount = await query(`
      SELECT COUNT(*) as count 
      FROM Attendance 
      WHERE ClockOutTime IS NULL 
      AND DATE(ClockInTime) < DATE(@param0)
    `, [new Date()]);

    return NextResponse.json({ 
      activeAttendanceCount: activeCount[0].count,
      message: "Use POST to execute auto clock-out"
    });
  } catch (error) {
    console.error('Auto clock-out status error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}
