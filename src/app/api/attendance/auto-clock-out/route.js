import { query } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getShortAddress } from "@/lib/geolocation";

export async function POST(req) {
  try {
    // Find all users who are clocked in but haven't clocked out
    const activeAttendance = await query(`
      SELECT a.Id, a.UserId, a.ClockInTime, a.ClockInLat, a.ClockInLng, a.ClockInLocation, u.Username, u.FullName
      FROM Attendance a
      INNER JOIN Users u ON a.UserId = u.Id
      WHERE a.ClockOutTime IS NULL 
      AND CAST(a.ClockInTime AS DATE) < CAST(@param0 AS DATE)
    `, [new Date()]);

    if (activeAttendance.length === 0) {
      return NextResponse.json({ 
        message: "No active attendance records found",
        processedCount: 0
      });
    }

    const updatedRecords = [];
    const errors = [];
    
    for (const record of activeAttendance) {
      try {
        // Set clock out time to 11:59:59 PM of the same day as clock in
        const clockInDate = new Date(record.ClockInTime);
        const checkOutTime = new Date(clockInDate);
        checkOutTime.setHours(23, 59, 59, 999); // 11:59:59.999 PM

        // Use the same location as clock-in for system check-out
        let clockOutLat = record.ClockInLat;
        let clockOutLng = record.ClockInLng;
        let clockOutLocation = record.ClockInLocation || "System Auto Clock-Out";

        // Try to get updated location name, fallback to clock-in location
        try {
          if (clockOutLat && clockOutLng) {
            clockOutLocation = await getShortAddress(clockOutLat, clockOutLng);
          }
        } catch (geoError) {
          console.error('Error getting location name for user', record.UserId, ':', geoError);
          clockOutLocation = record.ClockInLocation || "System Auto Clock-Out";
        }

        await query(`
          UPDATE Attendance 
          SET ClockOutTime = @param0, 
              ClockOutLat = @param1, 
              ClockOutLng = @param2, 
              ClockOutLocation = @param3, 
              SelfieOut = 'SYSTEM_AUTO_CHECKOUT',
              EarlyClockOut = 0,
              EarlyClockOutReason = 'System automatic check-out at midnight',
              IsApproved = 1,
              ApprovalStatus = 'Approved',
              ApprovalMessage = 'System automatic check-out completed',
              IsSystemCheckout = 1,
              UpdatedAt = @param4
          WHERE Id = @param5
        `, [checkOutTime, clockOutLat, clockOutLng, clockOutLocation, new Date(), record.Id]);

        updatedRecords.push({
          attendanceId: record.Id,
          userId: record.UserId,
          username: record.Username,
          fullName: record.FullName,
          clockInTime: record.ClockInTime,
          autoClockOutTime: checkOutTime,
          clockOutLocation: clockOutLocation,
          clockOutLat: clockOutLat,
          clockOutLng: clockOutLng
        });

        console.log(`System auto check-out completed for user: ${record.Username} (${record.FullName})`);

      } catch (userError) {
        console.error(`Error processing auto check-out for user ${record.UserId}:`, userError);
        errors.push({
          userId: record.UserId,
          username: record.Username,
          error: userError.message
        });
      }
    }

    return NextResponse.json({ 
      message: `Auto clock-out completed for ${updatedRecords.length} records`,
      processedCount: updatedRecords.length,
      totalFound: activeAttendance.length,
      updatedRecords: updatedRecords,
      errors: errors,
      checkOutTime: new Date().toISOString()
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
    // Get detailed information about active attendance records (for monitoring)
    const activeAttendance = await query(`
      SELECT a.Id, a.UserId, a.ClockInTime, a.ClockInLocation, u.Username, u.FullName
      FROM Attendance a
      INNER JOIN Users u ON a.UserId = u.Id
      WHERE a.ClockOutTime IS NULL 
      AND CAST(a.ClockInTime AS DATE) < CAST(@param0 AS DATE)
      ORDER BY a.ClockInTime DESC
    `, [new Date()]);

    // Get today's active attendance
    const todayActive = await query(`
      SELECT COUNT(*) as count 
      FROM Attendance 
      WHERE ClockOutTime IS NULL 
      AND CAST(ClockInTime AS DATE) = CAST(@param0 AS DATE)
    `, [new Date()]);

    // Get past days pending attendance
    const pastPending = await query(`
      SELECT COUNT(*) as count 
      FROM Attendance 
      WHERE ClockOutTime IS NULL 
      AND CAST(ClockInTime AS DATE) < CAST(@param0 AS DATE)
    `, [new Date()]);

    return NextResponse.json({ 
      todayActiveCount: todayActive[0].count,
      pastPendingCount: pastPending[0].count,
      activeAttendanceRecords: activeAttendance,
      message: "Use POST to execute auto clock-out",
      needsAutoCheckout: pastPending[0].count > 0
    });
  } catch (error) {
    console.error('Auto clock-out status error:', error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}
