"use client";
import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, date, month
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  /* ================= LOAD EMPLOYEES ================= */
  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEmployees(data);
        } else {
          setError(data.error || "Failed to load employees");
        }
      })
      .catch(() => setError("Server error"));
  }, []);

  /* ================= LOAD ATTENDANCE ================= */
  const loadAttendance = (employee) => {
    setSelectedEmployee(employee);
    setLoading(true);
    setRecords([]);

    const token = localStorage.getItem("adminToken");

    fetch(`/api/admin/report?userId=${employee.id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setRecords(Array.isArray(data) ? data : []);
        setFilteredRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError("Failed to load attendance");
      });
  };

  /* ================= FILTER RECORDS ================= */
  useEffect(() => {
    if (records.length === 0) {
      setFilteredRecords([]);
      return;
    }

    let filtered = [...records];

    if (filterType === "date" && selectedDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.ClockInTime).toISOString().split('T')[0];
        return recordDate === selectedDate;
      });
    } else if (filterType === "month" && selectedMonth) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.ClockInTime);
        const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        return recordMonth === selectedMonth;
      });
    }

    setFilteredRecords(filtered);
  }, [records, filterType, selectedDate, selectedMonth]);

  const clearFilters = () => {
    setFilterType("all");
    setSelectedDate("");
    setSelectedMonth("");
  };

  /* ================= APPROVE ATTENDANCE ================= */
  const approveAttendance = async (attendanceId) => {
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/attendance-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ attendanceId })
      });

      if (res.ok) {
        // Refresh the attendance records
        if (selectedEmployee) {
          loadAttendance(selectedEmployee);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to approve attendance");
      }
    } catch (error) {
      setError("Error approving attendance");
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Always remove token and redirect, even if API fails
      localStorage.removeItem("adminToken");

      if (res.ok) {
        const data = await res.json();
        console.log("Admin logout successful:", data.message);
      } else {
        console.log("Admin logout API failed, but client-side logout completed");
      }

      // Redirect to admin login page
      window.location.href = "/admin";

    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, remove token and redirect
      localStorage.removeItem("adminToken");
      window.location.href = "/admin";
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* ================= BLUE SIDEBAR ================= */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-4 border-b border-blue-500">
          <h2 className="text-xl font-bold">Employees</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {employees.map(emp => (
            <div
              key={emp.id}
              onClick={() => loadAttendance(emp)}
              className={`p-3 rounded mb-1 cursor-pointer transition
                ${selectedEmployee?.id === emp.id
                  ? "bg-white text-gray-900"
                  : "hover:bg-blue-600"}
              `}
            >
              {emp.name}
            </div>
          ))}

          {employees.length === 0 && (
            <p className="text-blue-200 text-sm p-2">
              No employees found
            </p>
          )}
        </div>

        {/* Sticky Logout Button */}
        <div className="p-4 border-t border-blue-700 bg-blue-900">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">
          Admin Attendance Dashboard
        </h1>

        {!selectedEmployee && (
          <div className="text-gray-500">
            👈 Select an employee from sidebar to view attendance
          </div>
        )}

        {selectedEmployee && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Attendance: {selectedEmployee.name}
              </h2>

              {/* ================= FILTER SECTION ================= */}
              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Records</option>
                  <option value="date">By Date</option>
                  <option value="month">By Month</option>
                </select>

                {filterType === "date" && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}

                {filterType === "month" && (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}

                {(filterType !== "all" || selectedDate || selectedMonth) && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                )}

                <span className="text-xs text-gray-600">
                  {filteredRecords.length}/{records.length} records
                </span>
              </div>
            </div>

            {loading && (
              <p className="text-blue-600">Loading attendance...</p>
            )}

            {!loading && filteredRecords.length === 0 && (
              <p className="text-gray-500">
                {records.length === 0 ? "No attendance records found" : "No records match the selected filters"}
              </p>
            )}

            {!loading && filteredRecords.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-lg shadow-lg border border-gray-200">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="p-4 text-left font-semibold">Clock In</th>
                      <th className="p-4 text-left font-semibold">Clock Out</th>
                      <th className="p-4 text-left font-semibold">In Location</th>
                      <th className="p-4 text-left font-semibold">Out Location</th>
                      <th className="p-4 text-center font-semibold">Selfies</th>
                      <th className="p-4 text-center font-semibold">Status</th>
                      <th className="p-4 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, index) => (
                      <tr key={r.Id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(r.ClockInTime).toLocaleString()}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900">
                              {r.ClockOutTime
                                ? new Date(r.ClockOutTime).toLocaleString()
                                : "Not clocked out"}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-700 max-w-xs">
                            {r.ClockInLocation || `${r.ClockInLat}, ${r.ClockInLng}`}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-700 max-w-xs">
                            {r.ClockOutLocation
                              ? r.ClockOutLocation
                              : r.ClockOutLat
                                ? `${r.ClockOutLat}, ${r.ClockOutLng}`
                                : "Not available"}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center space-x-2">
                            {r.SelfieIn && (
                              <img
                                src={r.SelfieIn}
                                alt="Clock In Selfie"
                                className="w-16 h-16 object-cover rounded-lg border-2 border-green-300 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                                onClick={() => window.open(r.SelfieIn, '_blank')}
                                title="Click to view Clock In selfie"
                              />
                            )}
                            {r.SelfieOut && (
                              <img
                                src={r.SelfieOut}
                                alt="Clock Out Selfie"
                                className="w-16 h-16 object-cover rounded-lg border-2 border-red-300 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                                onClick={() => window.open(r.SelfieOut, '_blank')}
                                title="Click to view Clock Out selfie"
                              />
                            )}
                            {!r.SelfieIn && !r.SelfieOut && (
                              <span className="text-gray-400 text-sm">No selfies</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {r.ApprovalStatus !== "Approved" ? (
                            <div className="space-y-1">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Approved
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {r.ApprovalStatus !== "Approved" ? (
                            <button
                              onClick={() => approveAttendance(r.Id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                            >
                              Approve
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-red-500 mt-4">{error}</p>
        )}
      </main>
    </div>
  );
}
