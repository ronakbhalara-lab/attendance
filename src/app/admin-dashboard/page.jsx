"use client";
import { useEffect, useState } from "react";

// Helper function to convert file path to API URL
const getImageUrl = (filePath) => {
  if (!filePath) return null;
  // Extract filename from D:\attendanceImage\filename
  const filename = filePath.split('\\').pop();
  return `/api/images?filename=${filename}`;
};

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
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const openImageModal = (imagePath, type) => {
    setSelectedImage({ path: imagePath, type: type });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setShowImageModal(false);
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
      <aside className={`${isSidebarOpen ? (isSidebarCollapsed ? 'w-16' : 'w-64') : 'w-0'} bg-blue-900 text-white flex flex-col transition-all duration-300 overflow-hidden`}>
        {/* Hamburger Menu Button */}
        <div className="p-4 border-b border-blue-500 flex justify-between items-center">
          {!isSidebarCollapsed && <h2 className="text-xl font-bold">Employees</h2>}
          <div className="flex gap-2">
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 bg-blue-800 text-white rounded hover:bg-blue-700 transition-colors"
                title={isSidebarCollapsed ? "Expand" : "Collapse"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isSidebarCollapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  )}
                </svg>
              </button>
            )}
            {/* <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 bg-blue-800 text-white rounded hover:bg-blue-700 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button> */}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {employees.map(emp => (
            <div
              key={emp.id}
              onClick={() => loadAttendance(emp)}
              className={`p-3 rounded mb-1 cursor-pointer transition flex items-center justify-center
                ${selectedEmployee?.id === emp.id
                  ? "bg-white text-gray-900"
                  : "hover:bg-blue-600"}
                ${isSidebarCollapsed ? 'text-center' : ''}
              `}
              title={isSidebarCollapsed ? emp.name : ''}
            >
              {isSidebarCollapsed ? (
                <span className="text-lg font-bold">
                  {emp.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                emp.name
              )}
            </div>
          ))}

          {employees.length === 0 && (
            <p className={`text-blue-200 text-sm p-2 ${isSidebarCollapsed ? 'text-center' : ''}`}>
              {isSidebarCollapsed ? 'No' : 'No employees found'}
            </p>
          )}
        </div>

        {/* Sticky Logout Button */}
        <div className="p-4 border-t border-blue-700 bg-blue-900">
          <button
            onClick={handleLogout}
            className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm
              ${isSidebarCollapsed ? 'text-xs' : ''}
            `}
            title={isSidebarCollapsed ? 'Logout' : ''}
          >
            {isSidebarCollapsed ? (
              <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            ) : (
              'Logout'
            )}
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 p-6 overflow-auto relative">
        {/* Hamburger Menu Button - Only show when sidebar is closed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-4 left-4 z-10 p-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className={`${isSidebarOpen ? 'ml-0' : 'ml-0'}`}>
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
                  <thead className="bg-blue-900 text-white sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap">Date</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap">Clock In Time</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap">Clock Out Time</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap">In Location</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap">Out Location</th>
                      <th className="p-3 text-center font-semibold text-sm whitespace-nowrap">Clock In Selfie</th>
                      <th className="p-3 text-center font-semibold text-sm whitespace-nowrap">Clock Out Selfie</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap">Late Arrival</th>
                      <th className="p-3 text-left font-semibold text-sm whitespace-nowrap">Early Departure</th>
                      <th className="p-3 text-center font-semibold text-sm whitespace-nowrap">Status</th>
                      <th className="p-3 text-center font-semibold text-sm whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, index) => (
                      <tr key={r.Id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="p-3">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(r.ClockInTime).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-gray-700">
                            {new Date(r.ClockInTime).toLocaleTimeString('en-IN', { 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit',
                              hour12: true 
                            })}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-gray-700">
                            {r.ClockOutTime
                              ? new Date(r.ClockOutTime).toLocaleTimeString('en-IN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit', 
                                  second: '2-digit',
                                  hour12: true 
                                })
                              : "Not clocked out"}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-gray-700 max-w-xs truncate" title={r.ClockInLocation || `${r.ClockInLat}, ${r.ClockInLng}`}>
                            {r.ClockInLocation || `${r.ClockInLat}, ${r.ClockInLng}`}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-gray-700 max-w-xs truncate" title={r.ClockOutLocation || (r.ClockOutLat ? `${r.ClockOutLat}, ${r.ClockOutLng}` : "Not available")}>
                            {r.ClockOutLocation
                              ? r.ClockOutLocation
                              : r.ClockOutLat
                                ? `${r.ClockOutLat}, ${r.ClockOutLng}`
                                : "Not available"}
                          </p>
                        </td>
                        <td className="p-3 text-center">
                          {r.SelfieIn ? (
                            <img
                              src={getImageUrl(r.SelfieIn)}
                              alt="Clock In Selfie"
                              className="w-12 h-12 object-cover rounded-lg border-2 border-green-300 cursor-pointer hover:scale-110 transition-transform shadow-sm mx-auto"
                              onClick={() => openImageModal(getImageUrl(r.SelfieIn), 'Clock In')}
                              title="Click to view Clock In selfie"
                            />
                          ) : (
                            <span className="text-gray-400 text-sm">No selfie</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.SelfieOut ? (
                            <img
                              src={getImageUrl(r.SelfieOut)}
                              alt="Clock Out Selfie"
                              className="w-12 h-12 object-cover rounded-lg border-2 border-red-300 cursor-pointer hover:scale-110 transition-transform shadow-sm mx-auto"
                              onClick={() => openImageModal(getImageUrl(r.SelfieOut), 'Clock Out')}
                              title="Click to view Clock Out selfie"
                            />
                          ) : (
                            <span className="text-gray-400 text-sm">No selfie</span>
                          )}
                        </td>
                        <td className="p-3">
                          {r.IsLate && r.LateClockInReason ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 max-w-xs">
                              <div className="flex items-center space-x-1 mb-1">
                                <svg className="w-3 h-3 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-semibold text-amber-800">LATE</span>
                              </div>
                              <p className="text-xs text-gray-700 break-words leading-relaxed" title={r.LateClockInReason}>
                                {r.LateClockInReason.length > 30 ? `${r.LateClockInReason.substring(0, 30)}...` : r.LateClockInReason}
                              </p>
                              <div className="mt-1 text-xs text-amber-600">
                                {!r.IsApproved ? "Pending" : "Approved"}
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm text-center">-</div>
                          )}
                        </td>
                        <td className="p-3">
                          {r.EarlyClockOut && r.EarlyClockOutReason ? (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 max-w-xs">
                              <div className="flex items-center space-x-1 mb-1">
                                <svg className="w-3 h-3 text-orange-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-semibold text-orange-800">EARLY</span>
                              </div>
                              <p className="text-xs text-gray-700 break-words leading-relaxed" title={r.EarlyClockOutReason}>
                                {r.EarlyClockOutReason.length > 30 ? `${r.EarlyClockOutReason.substring(0, 30)}...` : r.EarlyClockOutReason}
                              </p>
                              <div className="mt-1 text-xs text-orange-600">
                                {!r.IsApproved ? "Pending" : "Approved"}
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm text-center">-</div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.ApprovalStatus !== "Approved" ? (
                            <div className="inline-flex items-center space-x-1 bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1">
                              <svg className="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs font-medium text-yellow-800">Pending</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs font-medium text-green-800">Approved</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.ApprovalStatus !== "Approved" ? (
                            <button
                              onClick={() => approveAttendance(r.Id)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                            >
                              Approve
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
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

        </div>

        {error && (
          <p className="text-red-500 mt-4">{error}</p>
        )}
      </main>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div
            className="relative max-w-4xl max-h-full bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">{selectedImage.type} Selfie</h3>
              <button
                onClick={closeImageModal}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 bg-gray-100">
              <img
                src={selectedImage.path}
                alt={`${selectedImage.type} Selfie`}
                className="max-w-full max-h-96 object-contain mx-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="p-4 border-t bg-white">
              <button
                onClick={closeImageModal}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
