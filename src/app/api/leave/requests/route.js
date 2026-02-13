import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/prisma';

export async function GET(request) {
  try {
    /* ================= AUTH ================= */
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    /* ================= DB QUERY ================= */
    const sqlQuery = `
      SELECT 
        id, 
        userId, 
        leaveType, 
        startDate, 
        endDate, 
        reason, 
        leaveDuration, 
        status, 
        createdAt,
        updatedAt
      FROM LeaveRequests 
      WHERE userId = ? 
      ORDER BY createdAt DESC
    `;

    const params = [userId];
    const data = await query(sqlQuery, params);

    // Format the dates for frontend compatibility
    const formattedData = data.map(request => ({
      ...request,
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString()
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Leave Requests API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    /* ================= AUTH ================= */
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    /* ================= VALIDATION ================= */
    const body = await request.json();
    const { leaveType, startDate, endDate, reason, leaveDuration } = body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    /* ================= DB INSERT ================= */
    const insertQuery = `
      INSERT INTO LeaveRequests (userId, leaveType, startDate, endDate, reason, leaveDuration, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', GETDATE(), GETDATE())
      
      SELECT SCOPE_IDENTITY() as id, 
             userId, 
             leaveType, 
             startDate, 
             endDate, 
             reason, 
             leaveDuration, 
             status, 
             createdAt, 
             updatedAt
      FROM LeaveRequests 
      WHERE id = SCOPE_IDENTITY()
    `;

    const params = [userId, leaveType, startDate, endDate, reason, leaveDuration];
    const result = await query(insertQuery, params);
    
    if (result && result.length > 0) {
      const newLeaveRequest = result[0];
      
      // Format the dates for frontend compatibility
      const formattedRequest = {
        ...newLeaveRequest,
        startDate: newLeaveRequest.startDate.toISOString(),
        endDate: newLeaveRequest.endDate.toISOString(),
        createdAt: newLeaveRequest.createdAt.toISOString(),
        updatedAt: newLeaveRequest.updatedAt.toISOString()
      };

      return NextResponse.json(formattedRequest, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Failed to create leave request' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Leave Requests POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
