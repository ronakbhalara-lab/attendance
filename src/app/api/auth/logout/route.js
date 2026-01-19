import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Create response that clears cookies
    const response = NextResponse.json({
      message: "Logout successful"
    });

    // Clear all auth cookies
    response.cookies.delete('token', { path: '/' });
    response.cookies.delete('userId', { path: '/' });
    response.cookies.delete('role', { path: '/' });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
