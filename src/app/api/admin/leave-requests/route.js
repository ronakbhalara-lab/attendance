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

    if (decoded.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    /* ================= DB QUERY ================= */
    const sqlQuery = `
      SELECT 
        lr.id,
        lr.userId,
        lr.leaveType,
        lr.startDate,
        lr.endDate,
        lr.reason,
        lr.leaveDuration,
        lr.status,
        lr.createdAt,
        lr.updatedAt,
        u.FullName as userName,
        u.Username as userUsername,
        lr.actionBy
      FROM LeaveRequests lr
      INNER JOIN Users u ON lr.userId = u.Id
      ORDER BY lr.createdAt DESC
    `;

    const data = await query(sqlQuery);

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
    console.error('Admin Leave Requests API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
