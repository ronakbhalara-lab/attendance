import jwt from "jsonwebtoken";

export function getUserFromToken(req) {
  // Try to get token from Authorization header first
  const authHeader = req.headers.get("authorization");
  let token = authHeader ? authHeader.replace("Bearer ", "") : null;
  
  // If no token in header, try cookies (for middleware)
  if (!token && req.cookies) {
    token = req.cookies.get("token")?.value;
  }
  
  // If still no token, try localStorage (for client-side)
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem("token");
  }
  
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}
