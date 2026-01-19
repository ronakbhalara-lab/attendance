import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

// This is the main middleware function that Next.js expects
export function middleware(request) {
  try {
    // Get the pathname from the request
    const { pathname } = request.nextUrl;
    
    // Define protected routes
    const protectedRoutes = ['/dashboard'];
    const apiRoutes = ['/api/attendance'];
    
    // Check if the current path is protected
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isApiRoute = apiRoutes.some(route => pathname.startsWith(route));
    
    // If it's a protected route, check authentication
    if (isProtectedRoute || isApiRoute) {
      // Get token from Authorization header or cookies
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '') || 
                     request.cookies.get('token')?.value;
      
      if (!token) {
        // Redirect to login for protected pages
        if (isProtectedRoute) {
          const loginUrl = new URL('/', request.url);
          return NextResponse.redirect(loginUrl);
        }
        
        // Return 401 for API routes
        if (isApiRoute) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
      
      // Validate token
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format');
        }
        
        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Date.now() / 1000;
        
        if (payload.exp && payload.exp < currentTime) {
          throw new Error('Token expired');
        }
        
        // For admin routes, check role
        // if (pathname.startsWith('/admin') && payload.role !== 'Admin') {
        //   if (isProtectedRoute) {
        //     return NextResponse.redirect(new URL('/dashboard', request.url));
        //   }
        //   if (isApiRoute) {
        //     return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        //   }
        // }
        
        // Token is valid, continue
        return NextResponse.next();
        
      } catch (error) {
        console.error('Token validation error:', error);
        
        // Redirect to login for protected pages
        if (isProtectedRoute) {
          const loginUrl = new URL('/', request.url);
          return NextResponse.redirect(loginUrl);
        }
        
        // Return 401 for API routes
        if (isApiRoute) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }
    
    // For non-protected routes, continue
    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Export the higher-order functions for use in API routes
export function withAuth(handler) {
  return async (req) => {
    try {
      const user = getUserFromToken(req);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      // Add user info to request for use in handler
      req.user = user;
      
      return handler(req);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
  };
}

// Admin-only middleware
export function withAdminAuth(handler) {
  return async (req) => {
    try {
      const user = getUserFromToken(req);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      if (user.role !== 'Admin') {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }
      
      // Add user info to request for use in handler
      req.user = user;
      
      return handler(req);
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
  };
}
