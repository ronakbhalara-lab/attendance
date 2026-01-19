  import { NextResponse } from 'next/server';
  import { query } from '@/lib/prisma';
  import { verifyToken } from '@/lib/jwt';

  export async function GET(request) {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      
      // Verify token and get user ID
      const decoded = verifyToken(token);
      
      if (!decoded || !decoded.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      // Get user details from database using SQL query
      const users = await query(
        'SELECT Id, Username, FullName as name, Role FROM Users WHERE Id = @param0',
        [decoded.userId]
      );

      if (users.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = users[0];
      
      // Format the response to match expected structure
      const formattedUser = {
        id: user.Id.toString(),
        username: user.Username,
        email: user.Username, // Using username as email since email column doesn't exist
        name: user.name,
        role: user.Role
      };

      return NextResponse.json(formattedUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
