import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/prisma';

export async function PATCH(request, { params }) {
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

    const leaveId = params.id;
    const body = await request.json();
    const { status } = body;

    if (!status || !['approve', 'reject', 'cancel'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    /* ================= DB UPDATE ================= */
    const statusMap = {
      'approve': 'approved',
      'reject': 'rejected',
      'cancel': 'cancelled'
    };

    const updateQuery = `
      UPDATE LeaveRequests 
      SET status = ?, updatedAt = GETDATE()
      WHERE id = ?
    `;

    await query(updateQuery, [statusMap[status], leaveId]);

    // Get updated leave request for response
    const selectQuery = `
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
        u.Username as userUsername
      FROM LeaveRequests lr
      INNER JOIN Users u ON lr.userId = u.Id
      WHERE lr.id = ?
    `;

    const result = await query(selectQuery, [leaveId]);

    if (result && result.length > 0) {
      const updatedRequest = result[0];
      
      // Format the dates for frontend compatibility
      const formattedRequest = {
        ...updatedRequest,
        startDate: updatedRequest.startDate.toISOString(),
        endDate: updatedRequest.endDate.toISOString(),
        createdAt: updatedRequest.createdAt.toISOString(),
        updatedAt: updatedRequest.updatedAt.toISOString()
      };

      return NextResponse.json(formattedRequest);
    } else {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Admin Leave Update API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
