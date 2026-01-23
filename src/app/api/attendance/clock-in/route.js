import { query } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getShortAddress } from "@/lib/geolocation";

/* ===== LATE CHECK FUNCTION ===== */
function isLateClockIn(date = new Date()) {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  return totalMinutes > 580; // 9:40 AM
}

export async function POST(req) {
  try {
    const user = getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let file, lat, lng, lateClockInReason;
    
    // Check if request is FormData or JSON
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      // Handle FormData (from web form with file upload)
      const data = await req.formData();
      file = data.get("selfie");
      lat = data.get("lat");
      lng = data.get("lng");
      lateClockInReason = data.get("lateClockInReason");
    } else {
      // Handle JSON (from mobile app or direct API call)
      try {
        const body = await req.json();
        file = body.selfie;
        lat = body.lat;
        lng = body.lng;
        lateClockInReason = body.lateClockInReason;
      } catch (jsonError) {
        return NextResponse.json({ 
          error: "Invalid JSON format", 
          details: "Expected JSON with lat, lng, selfie, and optionally lateClockInReason fields"
        }, { status: 400 });
      }
    }

    console.log('Clock-in attempt:', { userId: user.userId, hasFile: !!file, lat, lng, contentType, lateClockInReason });

    // Validate required fields
    if (!lat || !lng) {
      return NextResponse.json({ 
        error: "Location coordinates are required. Please enable location services and try again." 
      }, { status: 400 });
    }

    // Validate coordinate values
    const numLat = Number(lat);
    const numLng = Number(lng);
    
    if (isNaN(numLat) || isNaN(numLng)) {
      return NextResponse.json({ 
        error: "Invalid location coordinates. Please try again." 
      }, { status: 400 });
    }

    // Validate coordinate ranges (latitude: -90 to 90, longitude: -180 to 180)
    if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
      return NextResponse.json({ 
        error: "Location coordinates out of valid range. Please check your location settings." 
      }, { status: 400 });
    }

    console.log('Validated coordinates:', { lat: numLat, lng: numLng });

    // Get location name from coordinates
    let locationName = "Location not available";
    try {
      locationName = await getShortAddress(numLat, numLng);
      console.log('Location name:', locationName);
    } catch (geoError) {
      console.error('Error getting location name:', geoError);
      // Continue with coordinates if geocoding fails
    }

    // Check for pending clock-in approval from previous days
    const pendingApproval = await query(
      'SELECT Id FROM Attendance WHERE UserId = @param0 AND IsApproved = 0 AND ClockOutTime IS NULL',
      [user.userId]
    );

    if (pendingApproval.length > 0) {
      return NextResponse.json({ 
        error: "You have a pending clock-in approval. Please wait for admin approval before clocking in again." 
      }, { status: 400 });
    }

    // Check if already clocked in today
    const todayClockIn = await query(
      'SELECT Id FROM Attendance WHERE UserId = @param0 AND CAST(ClockInTime AS DATE) = CAST(GETDATE() AS DATE)',
      [user.userId]
    );

    if (todayClockIn.length > 0) {
      return NextResponse.json({ 
        error: "Already clocked in today" 
      }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "Selfie photo is required for clock in" }, { status: 400 });
    }

    // Clock in with photo (now mandatory)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = Date.now() + "_" + file.name;

    // Ensure attendanceImage directory exists
    const uploadsDir = 'D:\\attendanceImage';
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Save file to D:\attendanceImage directory
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    const now = new Date();
    const isLate = isLateClockIn(now);

    let approvalStatus = "Approved";
    let isApproved = 1;
    let approvalMessage = null;
    let finalLateReason = null;

    if (isLate) {
      // Require reason for late clock-in
      if (!lateClockInReason || lateClockInReason.trim() === '') {
        return NextResponse.json({ 
          error: "Late clock-in detected (after 9:40 AM). Please provide a reason for late arrival." 
        }, { status: 400 });
      }
      approvalStatus = "Pending";
      isApproved = 0;
      approvalMessage = "You are late, contact your admin for approval";
      finalLateReason = lateClockInReason.trim();
    }

    await query(
      'INSERT INTO Attendance (UserId, ClockInTime, ClockInLat, ClockInLng, ClockInLocation, SelfieIn, CreatedAt, IsLate, IsApproved, ApprovalStatus, ApprovalMessage, LateClockInReason) VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7, @param8, @param9, @param10, @param11)',
      [user.userId, now, numLat, numLng, locationName, "D:\\attendanceImage\\" + fileName, now, isLate ? 1 : 0, isApproved, approvalStatus, approvalMessage, finalLateReason]
    );

    if (isLate) {
      return NextResponse.json({
        message: approvalMessage,
        isLate: true,
        lateClockInReason: finalLateReason
      });
    }

    return NextResponse.json({ 
      message: "Clock In Success with Photo",
      photoPath: "D:\\attendanceImage\\" + fileName,
      isLate: false
    });
  } catch (error) {
    console.error('Clock-in error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}
