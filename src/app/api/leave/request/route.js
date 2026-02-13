import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = 1; // Replace with actual user ID from token
    const body = await request.json();

    const { leaveType, startDate, endDate, reason, leaveDuration } = body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // For now, return mock response - replace with actual database insert
    const newLeaveRequest = {
      id: Date.now(), // Generate temporary ID
      userId,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      leaveDuration,
      status: 'pending',
      createdAt: new Date()
    };

    // TODO: Replace with actual database insert query
    console.log('Leave request to save:', newLeaveRequest);

    return NextResponse.json(newLeaveRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}