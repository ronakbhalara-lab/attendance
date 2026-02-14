import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/prisma';

export async function PUT(request, context) {
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
    const { id } = await context.params;
    const body = await request.json();
    const { status, actionBy } = body;

    console.log('Received body:', body); // Debug log
    console.log('Status:', status, 'ActionBy:', actionBy); // Debug log

    if (!status || !actionBy) {
      console.log('Validation failed - Missing fields:', { status, actionBy });
      return NextResponse.json(
        { error: 'Status and actionBy are required' },
        { status: 400 }
      );
    }

    // Validate status values
    const validStatuses = ['approve', 'reject', 'cancel', 'approved', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      console.log('Validation failed - Invalid status:', status);
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // First check if the leave request exists and get user info
    const checkQuery = `
      SELECT lr.*, u.FullName as userName 
      FROM LeaveRequests lr 
      LEFT JOIN Users u ON lr.userId = u.Id 
      WHERE lr.id = ?
    `;
    
    const existingRequest = await query(checkQuery, [id]);
    
    if (!existingRequest || existingRequest.length === 0) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    const leaveRequest = existingRequest[0];

    // Check if user can perform this action
    if (actionBy === 'employee') {
      // Employee can only cancel their own pending requests
      if (leaveRequest.userId !== userId) {
        return NextResponse.json(
          { error: 'You can only cancel your own leave requests' },
          { status: 403 }
        );
      }
      
      if (leaveRequest.status !== 'pending') {
        return NextResponse.json(
          { error: 'You can only cancel pending leave requests' },
          { status: 400 }
        );
      }
      
      if (status !== 'cancelled') {
        return NextResponse.json(
          { error: 'Employees can only cancel leave requests' },
          { status: 400 }
        );
      }
    } else if (actionBy === 'admin') {
      // Admin can approve/reject/cancel any request
      // Additional admin validation can be added here
    }

    /* ================= DB UPDATE ================= */
    const updateQuery = `
      UPDATE LeaveRequests 
      SET status = ?, updatedAt = GETDATE(), actionBy = ?
      WHERE id = ?
      
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
        lr.actionBy
      FROM LeaveRequests lr
      LEFT JOIN Users u ON lr.userId = u.Id
      WHERE lr.id = ?
    `;

    const params = [status, actionBy, id, id];
    const result = await query(updateQuery, params);
    
    if (result && result.length > 0) {
      const updatedRequest = result[0];
      
      // Format dates for frontend compatibility
      const formattedRequest = {
        ...updatedRequest,
        startDate: updatedRequest.startDate.toISOString(),
        endDate: updatedRequest.endDate.toISOString(),
        createdAt: updatedRequest.createdAt.toISOString(),
        updatedAt: updatedRequest.updatedAt.toISOString()
      };

      return NextResponse.json({
        success: true,
        message: `Leave request ${status} successfully`,
        data: formattedRequest
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to update leave request' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Leave Request Update API Error:', error);
    console.error('SQL Error Details:', error.message); // Add more detailed error logging
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
