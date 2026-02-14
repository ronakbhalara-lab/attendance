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

  try {
    const employees = await query(`
      SELECT 
        Id, 
        FullName, 
        Username,
        salary,
        leaveDeduction,
        salaryUpdatedAt,
        updatedBy,
        CreatedAt
      FROM Users
      WHERE Role = 'user'
      ORDER BY FullName
    `);

    return NextResponse.json(
      employees.map(emp => ({
        id: emp.Id,
        name: emp.FullName,
        username: emp.Username,
        salary: emp.salary || 0,
        leaveDeduction: emp.leaveDeduction || 0,
        salaryUpdatedAt: emp.salaryUpdatedAt,
        updatedBy: emp.updatedBy,
        createdAt: emp.CreatedAt
      }))
    );
  } catch (error) {
    console.error("Error fetching employees salary data:", error);
    return NextResponse.json({ error: "Failed to fetch employees data" }, { status: 500 });
  }
}

export async function PUT(req) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = auth.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded || decoded.role !== "Admin") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { employeeId, salary } = await req.json();

    if (!employeeId || salary === undefined) {
      return NextResponse.json({ error: "Employee ID and salary are required" }, { status: 400 });
    }

    // Update employee salary
    await query(
      `UPDATE Users 
       SET salary = @param0,
           salaryUpdatedAt = GETDATE(),
           updatedBy = @param1
       WHERE Id = @param2`,
      [salary, decoded.userId, employeeId]
    );

    return NextResponse.json({ 
      message: "Salary updated successfully",
      employeeId: employeeId,
      salary: salary
    });

  } catch (error) {
    console.error("Error updating employee salary:", error);
    return NextResponse.json({ error: "Failed to update salary" }, { status: 500 });
  }
}
