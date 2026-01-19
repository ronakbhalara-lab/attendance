import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { query } from "@/lib/prisma";

export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = auth.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded || decoded.role !== "Admin") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const users = await query(`
    SELECT Id, FullName
    FROM Users
    WHERE Role = 'user'
    ORDER BY FullName
  `);

  return NextResponse.json(
    users.map(u => ({ id: u.Id, name: u.FullName }))
  );
}
