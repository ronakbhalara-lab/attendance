import { query } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getShortAddress } from "@/lib/geolocation";

/* ===== EARLY CLOCK-OUT CHECK FUNCTION ===== */
function isEarlyClockOut(date = new Date()) {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  return totalMinutes < 1110; // 6:30 PM = 18 * 60 + 30 = 1110 minutes
}

export async function POST(req) {
  try {
    const user = getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let file, lat, lng, earlyClockOutReason;
    
    // Check if request is FormData or JSON
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      // Handle FormData (from web form with file upload)
      const data = await req.formData();
      file = data.get("selfie");
      lat = data.get("lat");
      lng = data.get("lng");
      earlyClockOutReason = data.get("earlyClockOutReason");
    } else {
      // Handle JSON (from mobile app or direct API call)
      try {
        const body = await req.json();
        file = body.selfie;
        lat = body.lat;
        lng = body.lng;
        earlyClockOutReason = body.earlyClockOutReason;
      } catch (jsonError) {
        return NextResponse.json({ 
          error: "Invalid JSON format", 
          details: "Expected JSON with lat, lng, selfie, and optionally earlyClockOutReason fields"
        }, { status: 400 });
      }
    }

    console.log('Clock-out attempt:', { userId: user.userId, hasFile: !!file, lat, lng, contentType, earlyClockOutReason });

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

    if (!file) {
      return NextResponse.json({ error: "Selfie photo is required for clock out" }, { status: 400 });
    }

    const today = await query(
      'SELECT Id FROM Attendance WHERE UserId = @param0 AND ClockOutTime IS NULL',
      [user.userId]
    );

    if (today.length === 0) {
      return NextResponse.json({ error: "Not clocked in" }, { status: 400 });
    }

    // Process selfie photo
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

    // Check if it's an early clock-out and require reason
    const now = new Date();
    const isEarly = isEarlyClockOut(now);
    let earlyClockOutFlag = 0;
    let finalReason = null;
    let needsApproval = false;

    if (isEarly) {
      if (!earlyClockOutReason || earlyClockOutReason.trim() === '') {
        return NextResponse.json({ 
          error: "Early clock-out detected (before 6:30 PM). Please provide a reason for early departure." 
        }, { status: 400 });
      }
      earlyClockOutFlag = 1;
      finalReason = earlyClockOutReason.trim();
      needsApproval = true;
    }

    // Update attendance record with approval status if needed
    let updateQuery, updateParams;
    
    if (needsApproval) {
      // Early clock-out requires approval
      updateQuery = 'UPDATE Attendance SET ClockOutTime = @param0, ClockOutLat = @param1, ClockOutLng = @param2, ClockOutLocation = @param3, SelfieOut = @param4, EarlyClockOut = @param5, EarlyClockOutReason = @param6, IsApproved = 0, ApprovalStatus = \'Pending\', ApprovalMessage = \'Early clock-out requires admin approval\' WHERE Id = @param7';
      updateParams = [new Date(), numLat, numLng, locationName, "D:\\attendanceImage\\" + fileName, earlyClockOutFlag, finalReason, today[0].Id];
    } else {
      // Normal clock-out
      updateQuery = 'UPDATE Attendance SET ClockOutTime = @param0, ClockOutLat = @param1, ClockOutLng = @param2, ClockOutLocation = @param3, SelfieOut = @param4, EarlyClockOut = @param5, EarlyClockOutReason = @param6 WHERE Id = @param7';
      updateParams = [new Date(), numLat, numLng, locationName, "D:\\attendanceImage\\" + fileName, earlyClockOutFlag, finalReason, today[0].Id];
    }

    await query(updateQuery, updateParams);

    return NextResponse.json({ 
      message: "Clock Out Success with Photo" + (isEarly ? " (Early Clock-out)" : ""),
      photoPath: "D:\\attendanceImage\\" + fileName,
      earlyClockOut: isEarly,
      earlyClockOutReason: finalReason,
      needsApproval: needsApproval
    });
  } catch (error) {
    console.error('Clock-out error:', error);
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
