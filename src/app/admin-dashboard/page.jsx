"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import LeaveNotificationToast from "@/components/LeaveNotificationToast";
import jsPDF from "jspdf";

// Helper function to convert file path to API URL
const getImageUrl = (filePath) => {
  if (!filePath) return null;
  // Extract filename from D:\attendanceImage\filename
  const filename = filePath.split('\\').pop();
  return `/api/images?filename=${filename}`;
};

// Helper function to get actual days in a month
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to get current month days for salary calculation
const getCurrentMonthDays = () => {
  const now = new Date();
  return getDaysInMonth(now.getFullYear(), now.getMonth());
};

// Helper function to get month name from month number
const getMonthName = (month) => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return monthNames[month];
};

// Helper function to filter records by selected month
const getRecordsByMonth = (records, year, month) => {
  return records.filter(record => {
    const recordDate = new Date(record.ClockInTime);
    return recordDate.getFullYear() === year && recordDate.getMonth() === month;
  });
};

// Helper function to filter records by selected month
const getRecordsBySelectedMonth = (records, selectedDate) => {
  if (!selectedDate) return records;
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  return records.filter(record => {
    const recordDate = new Date(record.ClockInTime);
    return recordDate.getFullYear() === year && recordDate.getMonth() === month;
  });
};

// Helper function to get days in a specific month
const getDaysInSelectedMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to generate salary slip PDF
const generateSalarySlipPDF = (
  employeeData,
  salaryData,
  approvedLeaves,
  rejectedLeaves,
  employeesSalaryData
) => {

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let y = 25;

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Get current date (17th February 2026)
  const currentDay = currentDate.getDate();
  const currentYear = currentDate.getFullYear();
  const currentMonth_index = currentDate.getMonth();

  // ===== Salary Calculations =====
  const empSalary = employeesSalaryData.find(
    (emp) => emp.id === parseInt(employeeData.employee.id)
  );

  const monthlySalary = empSalary?.salary || 0;

  // Get total days in current month
  const totalDaysInMonth = getDaysInMonth(currentYear, currentMonth_index);

  // Calculate days up to current date (1 to current day)
  const daysUpToToday = currentDay; // This will be 17 for 17th February

  const dailyWage = monthlySalary / totalDaysInMonth;

  // Filter records only for days 1 to current date
  const currentMonthRecords = employeeData.records.filter(record => {
    const recordDate = new Date(record.ClockInTime);
    return recordDate.getFullYear() === currentYear &&
      recordDate.getMonth() === currentMonth_index &&
      recordDate.getDate() <= currentDay;
  });

  const approvedDays = currentMonthRecords.filter(
    (r) => r.IsApproved === 1 || r.IsApproved === true
  ).length;

  // Filter leaves for days up to current date only
  const approvedLeaveDays = approvedLeaves[employeeData.employee.id] || 0;
  const rejectedLeaveDays = rejectedLeaves[employeeData.employee.id] || 0;

  const totalLeaveDeduction = approvedLeaveDays + rejectedLeaveDays * 2;

  // Calculate actual working days (only up to current date)
  const actualWorkingDays = daysUpToToday - totalLeaveDeduction;

  const netSalary = actualWorkingDays * dailyWage;

  // Currency formatter
  const formatCurrency = (amount) =>
    "Rs. " + amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ================= HEADER =================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("VEDNOVA IT SOLUTION", pageWidth / 2, y, { align: "center" });

  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "132, Kedar Business Center, Katargam, Surat, Gujarat - 395004",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 10;
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // ================= EMPLOYEE INFO =================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Salary Slip To:", margin, y);

  doc.setFont("helvetica", "normal");
  y += 8;
  doc.text(employeeData.employee.name, margin, y);
  // y += 6;
  // doc.text(
  //   `Department: ${employeeData.employee.department || "General"}`,
  //   margin,
  //   y
  // );

  // Right Side Info
  // doc.text(`Slip No: SLIP-${Date.now()}`, pageWidth - margin, y - 12, {
  //   align: "right",
  // });
  doc.text(`Date: ${currentDate.toLocaleDateString()}`, pageWidth - margin, y - 6, {
    align: "right",
  });
  doc.text(`Period: 1st - ${currentDay} ${currentMonth}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 15;
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ================= TABLE =================
  const tableWidth = pageWidth - margin * 2;
  const col1Width = 100;
  const col2Width = 40;
  const col3Width = tableWidth - col1Width - col2Width;

  const col1 = margin;
  const col2 = col1 + col1Width;
  const col3 = col2 + col2Width;

  const rowHeight = 10;

  // Header
  doc.setFont("helvetica", "bold");
  doc.rect(margin, y, tableWidth, rowHeight);

  doc.text("DESCRIPTION", col1 + 3, y + 7);
  doc.text("DAYS", col2 + col2Width / 2, y + 7, { align: "center" });
  doc.text("AMOUNT", col3 + col3Width - 3, y + 7, { align: "right" });

  y += rowHeight;
  doc.setFont("helvetica", "normal");

  const rows = [
    [
      `Total salary (${totalDaysInMonth} days)`,
      totalDaysInMonth,
      formatCurrency(monthlySalary),
    ],
    [
      `Leave Deductions (${approvedLeaveDays + rejectedLeaveDays} days)`,
      `${totalLeaveDeduction}`,
      `-${formatCurrency(totalLeaveDeduction * dailyWage)}`,
    ]     
  ];

  rows.forEach((row) => {
    doc.rect(margin, y, tableWidth, rowHeight);

    // Auto text wrap protection
    const description = doc.splitTextToSize(row[0], col1Width - 6);

    doc.text(description, col1 + 3, y + 6);
    doc.text(String(row[1]), col2 + col2Width / 2, y + 7, {
      align: "center",
    });
    if (row[2]) {
      doc.text(row[2], col3 + col3Width - 3, y + 7, {
        align: "right",
      });
    }

    y += rowHeight;
  });

  // Add total calculation row
  doc.rect(margin, y, tableWidth, rowHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TOTAL", col1 + 3, y + 7);
  doc.text("", col2 + col2Width / 2, y + 7, {
    align: "center",
  });
  const totalAfterDeduction = monthlySalary - (totalLeaveDeduction * dailyWage);
  doc.text(formatCurrency(totalAfterDeduction), col3 + col3Width - 3, y + 7, {
    align: "right",
  });

  y += rowHeight;

  // Add calculation note
  // y += 10;
  // doc.setFont("helvetica", "italic");
  // doc.setFontSize(8);
  // doc.text(
  //   `Note: Salary calculated for period 1st - ${currentDay} ${currentMonth} (${daysUpToToday} days)`,
  //   margin,
  //   y
  // );
  // y += 4;
  // doc.text(
  //   `Leave deduction: ${approvedLeaveDays + rejectedLeaveDays} days (${rejectedLeaveDays > 0 ? rejectedLeaveDays + ' rejected leaves double deducted' : ''})`,
  //   margin,
  //   y
  // );

  // y += 15;

  // // ================= NET SALARY =================
  // doc.setFont("helvetica", "bold");
  // doc.setFontSize(18);

  // doc.text(
  //   `NET SALARY FOR PERIOD : ${formatCurrency(netSalary)}`,
  //   pageWidth - margin,
  //   y,
  //   { align: "right" }
  // );

  // y += 15;
  // doc.line(margin, y, pageWidth - margin, y);

  // ================= SIGNATURE SECTION =================
  y += 20;
  
  // Right signature line - Vednova IT Solution
  const rightSignatureX = pageWidth - margin - 80;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("From Vednova IT Solution", rightSignatureX, y);
  y += 20;
  doc.line(rightSignatureX, y, rightSignatureX + 80, y);
  y += 5;
  // doc.text("_________________________", rightSignatureX, y);
  // y += 5;
  doc.setFontSize(9);
  doc.text("(Authorized Signature)", rightSignatureX, y);

  // ================= FOOTER =================
  y += 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");


  const fileName = `${employeeData.employee.name.replace(
    /\s+/g,
    "_"
  )}_${currentMonth.replace(/\s+/g, "_")}_Salary_Slip.pdf`;

  doc.save(fileName);
};

export default function AdminDashboard() {
  const { toasts, showToast, removeToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, date, month
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [autoClockOutStatus, setAutoClockOutStatus] = useState(null);
  const [runningAutoClockOut, setRunningAutoClockOut] = useState(false);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [viewMode, setViewMode] = useState("individual"); // individual, all-employees, leave-management, salary-report, final-report
  const [allEmployeesData, setAllEmployeesData] = useState({});
  const [loadingAllData, setLoadingAllData] = useState(false);
  const [allEmployeesFilter, setAllEmployeesFilter] = useState("all"); // all, pending, approved, late, early
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeaveData, setLoadingLeaveData] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState("all"); // all, pending, approved, rejected
  const [employeesSalaryData, setEmployeesSalaryData] = useState([]);
  const [loadingSalaryData, setLoadingSalaryData] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [approvedLeaves, setApprovedLeaves] = useState({});
  const [rejectedLeaves, setRejectedLeaves] = useState({});
  const [detailedLeaveInfo, setDetailedLeaveInfo] = useState({});
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedEmployeeForLeaves, setSelectedEmployeeForLeaves] = useState(null);
  const [showLeaveNotification, setShowLeaveNotification] = useState(false);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [notificationLastChecked, setNotificationLastChecked] = useState(null);
  const [hasNotifiedForCurrentBatch, setHasNotifiedForCurrentBatch] = useState(false);

  /* ================= CHECK PENDING LEAVE REQUESTS ================= */
  const checkPendingLeaveRequests = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/leave-requests", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const pendingLeaves = data.filter(leave =>
          leave.status === 'pending' || leave.status === 'Pending'
        );

        setPendingLeaveRequests(pendingLeaves);

        // Show notification only if there are pending leaves AND we haven't notified for this batch yet
        if (pendingLeaves.length > 0 && !hasNotifiedForCurrentBatch) {
          setShowLeaveNotification(true);
          setHasNotifiedForCurrentBatch(true);
        }

        // Reset notification flag when all pending leaves are cleared
        if (pendingLeaves.length === 0 && hasNotifiedForCurrentBatch) {
          setHasNotifiedForCurrentBatch(false);
          setShowLeaveNotification(false);
        }

        // Keep notification hidden for existing batch even if new pending requests come
        // The notification will only show again when all current pending requests are cleared and new ones come

        setNotificationLastChecked(new Date());
      }
    } catch (error) {
      console.error("Error checking pending leave requests:", error);
    }
  };

  /* ================= LOAD LEAVE REQUESTS ================= */
  const loadLeaveRequests = async () => {
    setLoadingLeaveData(true);
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/leave-requests", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(Array.isArray(data) ? data : []);
      } else {
        setError("Failed to load leave requests");
      }
    } catch (error) {
      setError("Server error loading leave requests");
    } finally {
      setLoadingLeaveData(false);
    }
  };

  /* ================= UPDATE LEAVE STATUS ================= */
  const updateLeaveStatus = async (leaveId, status) => {
    if (!confirm(`Are you sure you want to ${status} this leave request?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch(`/api/leave/requests/${leaveId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status,
          actionBy: 'admin'
        })
      });

      if (res.ok) {
        // Refresh leave requests
        loadLeaveRequests();
        // Check if there are still pending requests after this action
        setTimeout(async () => {
          await checkPendingLeaveRequests();
        }, 500);
        showToast(`Leave request ${status}d successfully`, 'success', 3000);
      } else {
        const data = await res.json();
        showToast(`Failed to ${status} leave request: ${data.error || 'Unknown error'}`, 'error', 5000);
      }
    } catch (error) {
      showToast(`Network error: ${error.message}`, 'error', 5000);
    }
  };

  const getCurrentMonthRecords = (records) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based (0 = January, 1 = February, etc.)

    return records.filter(record => {
      const recordDate = new Date(record.ClockInTime);
      return recordDate.getFullYear() === currentYear &&
        recordDate.getMonth() === currentMonth;
    });
  };

  /* ================= LOAD APPROVED LEAVES ================= */
  const loadApprovedLeaves = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/leave-requests", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const approvedLeavesData = {};

        // Group approved leaves by user and calculate total leave days
        data.forEach(leave => {
          if (leave.status === 'approve' || leave.status === 'approved') {
            if (!approvedLeavesData[leave.userId]) {
              approvedLeavesData[leave.userId] = 0;
            }

            // Calculate leave duration more accurately
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);

            let leaveDays = 0;

            if (leave.leaveDuration === 'full') {
              // For full day leaves, calculate the number of days in the date range
              const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
              leaveDays = daysDiff;
            } else if (leave.leaveDuration === 'firstHalf' || leave.leaveDuration === 'secondHalf') {
              // For half day leaves, calculate 0.5 days for each day in the date range
              const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
              leaveDays = 0.5 * daysDiff;
            }

            approvedLeavesData[leave.userId] += leaveDays;
          }
        });

        setApprovedLeaves(approvedLeavesData);
      }
    } catch (error) {
      console.error("Error loading approved leaves:", error);
    }
  };

  /* ================= LOAD REJECTED LEAVES ================= */
  const loadRejectedLeaves = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/leave-requests", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const rejectedLeavesData = {};

        // Group rejected leaves by user and calculate total leave days (for double deduction)
        data.forEach(leave => {
          if (leave.status === 'reject' || leave.status === 'rejected') {
            if (!rejectedLeavesData[leave.userId]) {
              rejectedLeavesData[leave.userId] = 0;
            }

            // Calculate leave duration more accurately
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);

            let leaveDays = 0;

            if (leave.leaveDuration === 'full') {
              // For full day leaves, calculate the number of days in the date range
              const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
              leaveDays = daysDiff;
            } else if (leave.leaveDuration === 'firstHalf' || leave.leaveDuration === 'secondHalf') {
              // For half day leaves, calculate 0.5 days for each day in the date range
              const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
              leaveDays = 0.5 * daysDiff;
            }

            rejectedLeavesData[leave.userId] += leaveDays;
          }
        });

        setRejectedLeaves(rejectedLeavesData);
      }
    } catch (error) {
      console.error("Error loading rejected leaves:", error);
    }
  };

  /* ================= GET EMPLOYEE WISE LEAVE DATA ================= */
  const getEmployeeWiseLeaveData = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/leave-requests", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const employeeLeaveData = {};

        // Group approved and rejected leaves by user
        data.forEach(leave => {
          if (leave.status === 'approve' || leave.status === 'approved' || leave.status === 'reject' || leave.status === 'rejected') {
            if (!employeeLeaveData[leave.userId]) {
              employeeLeaveData[leave.userId] = [];
            }

            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);

            if (leave.leaveDuration === 'full') {
              // For full day leaves, add each date in the range
              const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
              for (let i = 0; i <= daysDiff; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
                const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                employeeLeaveData[leave.userId].push({
                  date: formattedDate,
                  type: 'Full Day',
                  leaveType: leave.leaveType || 'Leave',
                  status: leave.status,
                  originalData: leave
                });
              }
            } else if (leave.leaveDuration === 'firstHalf' || leave.leaveDuration === 'secondHalf') {
              // For half day leaves, add each date in the range (not just single date)
              const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
              for (let i = 0; i <= daysDiff; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
                const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                employeeLeaveData[leave.userId].push({
                  date: formattedDate,
                  type: leave.leaveDuration === 'firstHalf' ? 'First Half' : 'Second Half',
                  leaveType: leave.leaveType || 'Leave',
                  status: leave.status,
                  originalData: leave
                });
              }
            }
          }
        });

        // Sort leaves by date for each employee
        Object.keys(employeeLeaveData).forEach(userId => {
          employeeLeaveData[userId].sort((a, b) => new Date(a.date) - new Date(b.date));
        });

        setDetailedLeaveInfo(employeeLeaveData);
      }
    } catch (error) {
      console.error("Error getting employee wise leave data:", error);
    }
  };

  /* ================= LOAD EMPLOYEES SALARY DATA ================= */
  const loadEmployeesSalaryData = async () => {
    setLoadingSalaryData(true);
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/employees-salary", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setEmployeesSalaryData(Array.isArray(data) ? data : []);
      } else {
        setError("Failed to load employees salary data");
      }
    } catch (error) {
      setError("Server error loading employees salary data");
    } finally {
      setLoadingSalaryData(false);
    }
  };

  /* ================= UPDATE EMPLOYEE SALARY ================= */
  const updateEmployeeSalary = async (employeeId, salary) => {
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/employees-salary", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          employeeId,
          salary
        })
      });

      if (res.ok) {
        // Refresh salary data
        loadEmployeesSalaryData();
        setEditingSalary(null);
        showToast("Salary updated successfully", 'success', 3000);
      } else {
        const data = await res.json();
        showToast(`Failed to update salary: ${data.error || 'Unknown error'}`, 'error', 5000);
      }
    } catch (error) {
      showToast(`Network error: ${error.message}`, 'error', 5000);
    }
  };

  /* ================= LOAD ALL EMPLOYEES ATTENDANCE ================= */
  const loadAllEmployeesAttendance = async () => {
    setLoadingAllData(true);
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch("/api/admin/report", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        // Group data by employee
        const groupedData = {};
        data.forEach(record => {
          if (!groupedData[record.UserId]) {
            groupedData[record.UserId] = {
              employee: {
                id: record.UserId,
                name: record.FullName || record.Username,
                username: record.Username
              },
              records: []
            };
          }
          groupedData[record.UserId].records.push(record);
        });
        setAllEmployeesData(groupedData);

        // Load employee wise leave data
        await getEmployeeWiseLeaveData();
      } else {
        setError("Failed to load all employees data");
      }
    } catch (error) {
      setError("Server error loading all employees data");
    } finally {
      setLoadingAllData(false);
    }
  };

  /* ================= LOAD EMPLOYEE STATISTICS ================= */
  const loadEmployeeStats = async (employeeId) => {
    try {
      const token = localStorage.getItem("adminToken");

      const res = await fetch(`/api/admin/employee-stats?userId=${employeeId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setEmployeeStats(data);
      } else {
        setEmployeeStats(null);
      }
    } catch (error) {
      setEmployeeStats(null);
    }
  };

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

  /* ================= LOAD AUTO CLOCK-OUT STATUS ================= */
  const loadAutoClockOutStatus = () => {
    const token = localStorage.getItem("adminToken");

    fetch("/api/attendance/auto-clock-out", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setAutoClockOutStatus(data);
      })
      .catch(() => {
        setAutoClockOutStatus({ error: "Failed to load status" });
      });
  };

  // Load auto clock-out status on component mount
  useEffect(() => {
    loadAutoClockOutStatus();
    // Check for pending leave requests on component mount
    checkPendingLeaveRequests();
  }, []);

  // Periodic checking for pending leave requests (every 10 seconds for more real-time feel)
  useEffect(() => {
    const interval = setInterval(() => {
      checkPendingLeaveRequests();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Load all employees data when view mode changes to all-employees, leave-management, salary-report, final-report, or salary-management
  useEffect(() => {
    if (viewMode === "all-employees") {
      loadAllEmployeesAttendance();
    } else if (viewMode === "leave-management") {
      loadLeaveRequests();
    } else if (viewMode === "salary-report") {
      loadAllEmployeesAttendance();
      loadApprovedLeaves();
      loadRejectedLeaves(); // Load rejected leaves for double deduction
      loadEmployeesSalaryData(); // Load salary data for salary report
    } else if (viewMode === "final-report") {
      loadAllEmployeesAttendance();
      loadApprovedLeaves();
      loadRejectedLeaves(); // Load rejected leaves for double deduction
    } else if (viewMode === "salary-management") {
      loadEmployeesSalaryData();
    }
  }, [viewMode]);

  /* ================= RUN AUTO CLOCK-OUT ================= */
  const runAutoClockOut = async () => {
    if (!confirm("Are you sure you want to run auto clock-out for all pending users?")) {
      return;
    }

    setRunningAutoClockOut(true);
    const token = localStorage.getItem("adminToken");

    try {
      const res = await fetch("/api/attendance/auto-clock-out", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Auto clock-out completed successfully!\n\nProcessed: ${data.processedCount} users\nTotal Found: ${data.totalFound} users${data.errors?.length > 0 ? `\nErrors: ${data.errors.length}` : ''}`);
        loadAutoClockOutStatus(); // Refresh status
        if (selectedEmployee) {
          loadAttendance(selectedEmployee); // Refresh attendance if employee is selected
        }
      } else {
        alert(`Auto clock-out failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setRunningAutoClockOut(false);
    }
  };

  /* ================= LOAD ATTENDANCE ================= */
  const loadAttendance = (employee) => {
    setSelectedEmployee(employee);
    setLoading(true);
    setRecords([]);
    setEmployeeStats(null); // Reset stats when loading new employee

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
        // Load stats after attendance data is loaded
        loadEmployeeStats(employee.id);
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
    } else if (filterType === "late") {
      filtered = filtered.filter(record => record.IsLate === 1 || record.IsLate === true);
    } else if (filterType === "approved") {
      filtered = filtered.filter(record => record.IsApproved === 1 || record.IsApproved === true);
    } else if (filterType === "pending") {
      filtered = filtered.filter(record => record.IsApproved === 0 || record.IsApproved === false);
    } else if (filterType === "system-checkout") {
      // Check if record has IsSystemCheckout property, if not check for system checkout patterns
      filtered = filtered.filter(record => {
        if (record.IsSystemCheckout !== undefined) {
          return record.IsSystemCheckout === 1 || record.IsSystemCheckout === true;
        } else {
          // Fallback: Check if SelfieOut is 'SYSTEM_AUTO_CHECKOUT' or other system patterns
          return record.SelfieOut === 'SYSTEM_AUTO_CHECKOUT' ||
            (record.ApprovalMessage && record.ApprovalMessage.includes('System automatic check-out'));
        }
      });
    } else if (filterType === "early-departure") {
      filtered = filtered.filter(record => record.EarlyClockOut === 1 || record.EarlyClockOut === true);
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

  /* ================= FILTER ALL EMPLOYEES DATA ================= */
  const getFilteredAllEmployeesData = () => {
    let filteredData = {};

    Object.entries(allEmployeesData).forEach(([employeeId, employeeData]) => {
      let filteredRecords = [...employeeData.records];

      // Apply filters based on the selected filter type
      switch (allEmployeesFilter) {
        case "pending":
          filteredRecords = filteredRecords.filter(r => r.IsApproved === 0 || r.IsApproved === false);
          break;
        case "approved":
          filteredRecords = filteredRecords.filter(r => r.IsApproved === 1 || r.IsApproved === true);
          break;
        case "late":
          filteredRecords = filteredRecords.filter(r => r.IsLate === 1 || r.IsLate === true);
          break;
        case "early":
          filteredRecords = filteredRecords.filter(r => r.EarlyClockOut === 1 || r.EarlyClockOut === true);
          break;
        case "today":
          const today = new Date().toDateString();
          filteredRecords = filteredRecords.filter(r => {
            const recordDate = new Date(r.ClockInTime).toDateString();
            return today === recordDate;
          });
          break;
        default:
          // "all" - no filtering
          break;
      }

      // Only include employee if they have filtered records
      if (filteredRecords.length > 0) {
        filteredData[employeeId] = {
          ...employeeData,
          records: filteredRecords
        };
      }
    });

    return filteredData;
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
        // Refresh the attendance records based on current view
        if (viewMode === "all-employees") {
          await loadAllEmployeesAttendance(); // Refresh all employees data
        } else if (selectedEmployee) {
          loadAttendance(selectedEmployee); // Refresh individual employee data
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
      {/* ================= SIDEBAR TRIGGER AREA ================= */}
      <div
        className="w-2 bg-blue-900 hover:bg-blue-800 transition-colors cursor-pointer"
        onMouseEnter={() => setIsSidebarOpen(true)}
      />

      {/* ================= BLUE SIDEBAR ================= */}
      <aside
        className={`${isSidebarOpen ? (isSidebarCollapsed ? 'w-16' : 'w-64') : 'w-0'} bg-blue-900 text-white flex flex-col transition-all duration-300 overflow-hidden`}
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
      >
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
          {/* All Employees Option */}
          <div
            onClick={() => {
              setViewMode("all-employees");
              setSelectedEmployee(null);
            }}
            className={`p-3 rounded mb-2 cursor-pointer transition flex items-center
              ${viewMode === "all-employees" && !selectedEmployee
                ? "bg-white text-blue-900"
                : "hover:bg-blue-600"}
              ${isSidebarCollapsed ? 'text-center' : ''}
            `}
            title={isSidebarCollapsed ? 'All Employees' : ''}
          >
            {isSidebarCollapsed ? (
              <span className="text-lg font-bold">
                📊
              </span>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-lg">📊</span>
                <span>All Employees</span>
              </div>
            )}
          </div>

          {/* Leave Management Option */}
          <div
            onClick={() => {
              setViewMode("leave-management");
              setSelectedEmployee(null);
            }}
            className={`p-3 rounded mb-2 cursor-pointer transition flex items-center
              ${viewMode === "leave-management"
                ? "bg-white text-blue-900"
                : "hover:bg-blue-600"}
              ${isSidebarCollapsed ? 'text-center' : ''}
            `}
            title={isSidebarCollapsed ? 'Leave Management' : ''}
          >
            {isSidebarCollapsed ? (
              <span className="text-lg font-bold">
                📝
              </span>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-lg">📝</span>
                <span>Leave Management</span>
              </div>
            )}
          </div>

          {/* Salary Management Option */}
          <div
            onClick={() => {
              setViewMode("salary-management");
              setSelectedEmployee(null);
            }}
            className={`p-3 rounded mb-2 cursor-pointer transition flex items-center
              ${viewMode === "salary-management"
                ? "bg-white text-blue-900"
                : "hover:bg-blue-600"}
              ${isSidebarCollapsed ? 'text-center' : ''}
            `}
            title={isSidebarCollapsed ? 'Salary Management' : ''}
          >
            {isSidebarCollapsed ? (
              <span className="text-lg font-bold">
                💵
              </span>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-lg">💵</span>
                <span>Salary Management</span>
              </div>
            )}
          </div>

          {/* Salary Report Option */}
          <div
            onClick={() => {
              setViewMode("salary-report");
              setSelectedEmployee(null);
            }}
            className={`p-3 rounded mb-2 cursor-pointer transition flex items-center
              ${viewMode === "salary-report"
                ? "bg-white text-blue-900"
                : "hover:bg-blue-600"}
              ${isSidebarCollapsed ? 'text-center' : ''}
            `}
            title={isSidebarCollapsed ? 'Salary Report' : ''}
          >
            {isSidebarCollapsed ? (
              <span className="text-lg font-bold">
                💰
              </span>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-lg">💰</span>
                <span>Salary Report</span>
              </div>
            )}
          </div>

          {/* Divider */}
          {!isSidebarCollapsed && (
            <div className="border-t border-blue-700 my-2"></div>
          )}

          {/* Final Report */}
          <div
            onClick={() => {
              setViewMode("final-report");
              setSelectedEmployee(null);
            }}
            className={`p-3 rounded mb-2 cursor-pointer transition flex items-center
              ${viewMode === "final-report"
                ? "bg-white text-blue-900"
                : "hover:bg-blue-600"}
              ${isSidebarCollapsed ? 'text-center' : ''}
            `}
            title={isSidebarCollapsed ? 'Final Report' : ''}
          >
            {isSidebarCollapsed ? (
              <span className="text-lg font-bold">
                📊
              </span>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-lg">📊</span>
                <span>Final Report</span>
              </div>
            )}
          </div>

          {/* Divider */}
          {!isSidebarCollapsed && (
            <div className="border-t border-blue-700 my-2"></div>
          )}

          {employees.map(emp => (
            <div
              key={emp.id}
              onClick={() => {
                loadAttendance(emp);
                setViewMode("individual");
              }}
              className={`p-3 rounded mb-1 cursor-pointer transition flex items-center
                ${selectedEmployee?.id === emp.id && viewMode === "individual"
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
        <div className={`${isSidebarOpen ? 'ml-0' : 'ml-0'}`}>
          <div className={`flex items-center justify-between mb-4 ${(viewMode === "leave-management" || viewMode === "salary-report" || viewMode === "final-report" || viewMode === "salary-management") ? 'hidden' : 'block'}`} >
            <h1 className="text-2xl font-bold">
              Admin Attendance Dashboard
            </h1>
          </div>

          {viewMode === "all-employees" && !loadingAllData && Object.keys(allEmployeesData).length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No attendance records found for any employees</p>
            </div>
          )}

          {viewMode === "individual" && !selectedEmployee && (
            <div className="text-gray-500">
              👈 Select an employee from sidebar to view attendance
            </div>
          )}

          {viewMode === "all-employees" && loadingAllData && (
            <div className="text-center py-8">
              <p className="text-blue-600">Loading all employees attendance data...</p>
            </div>
          )}

          {viewMode === "individual" && selectedEmployee && (
            <>
              {/* ================= EMPLOYEE STATISTICS ================= */}
              {employeeStats && (
                <div className="mb-6 bg-white rounded-lg shadow-md p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Employee Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{employeeStats.summary.TotalDays || 0}</div>
                      <div className="text-xs text-gray-600">Total Days</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{employeeStats.summary.ApprovedEntries || 0}</div>
                      <div className="text-xs text-gray-600">Approved</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-orange-600">{employeeStats.summary.PendingApprovals || 0}</div>
                      <div className="text-xs text-gray-600">Pending</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{employeeStats.summary.LateArrivals || 0}</div>
                      <div className="text-xs text-gray-600">Late Arrivals</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">{employeeStats.summary.EarlyDepartures || 0}</div>
                      <div className="text-xs text-gray-600">Early Departures</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-indigo-600">{employeeStats.summary.SystemCheckouts || 0}</div>
                      <div className="text-xs text-gray-600">System Checkouts</div>
                    </div>
                  </div>
                </div>
              )}

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
                    <option value="late">Late Arrivals Only</option>
                    <option value="approved">Approved Only</option>
                    <option value="pending">Pending Approval</option>
                    <option value="system-checkout">System Checkouts</option>
                    <option value="early-departure">Early Departures</option>
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

          {viewMode === "all-employees" && !loadingAllData && Object.keys(allEmployeesData).length > 0 && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Employees</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{Object.keys(allEmployeesData).length}</p>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Records</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {Object.values(allEmployeesData).reduce((sum, { records }) => sum + records.length, 0)}
                      </p>
                    </div>
                    <div className="bg-green-100 rounded-lg p-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Pending</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {Object.values(allEmployeesData).reduce((sum, { records }) =>
                          sum + records.filter(r => r.IsApproved === 0 || r.IsApproved === false).length, 0
                        )}
                      </p>
                    </div>
                    <div className="bg-amber-100 rounded-lg p-3">
                      <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Today</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {Object.values(allEmployeesData).reduce((sum, { records }) =>
                          sum + records.filter(r => {
                            const today = new Date().toDateString();
                            const recordDate = new Date(r.ClockInTime).toDateString();
                            return today === recordDate;
                          }).length, 0
                        )}
                      </p>
                    </div>
                    <div className="bg-purple-100 rounded-lg p-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">All Employees Attendance</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {Object.values(getFilteredAllEmployeesData()).reduce((sum, { records }) => sum + records.length, 0)} total records
                      </p>
                    </div>

                    {/* Filter Dropdown */}
                    <div className="flex items-center space-x-3">
                      <select
                        value={allEmployeesFilter}
                        onChange={(e) => setAllEmployeesFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Records</option>
                        <option value="pending">Pending Approval</option>
                        <option value="approved">Approved Only</option>
                        <option value="late">Late Arrivals</option>
                        <option value="early">Early Departures</option>
                        <option value="today">Today Only</option>
                      </select>

                      {allEmployeesFilter !== "all" && (
                        <button
                          onClick={() => setAllEmployeesFilter("all")}
                          className="px-3 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Clock In
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Clock Out
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Selfies
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.values(getFilteredAllEmployeesData()).map(({ employee, records }) => (
                          records.map((record, index) => (
                            <tr key={record.Id} className="hover:bg-gray-50">
                              {/* Employee Name - only show for first record */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                {index === 0 && (
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                      <span className="text-sm font-medium text-gray-600">
                                        {employee.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                                      <div className="text-xs text-gray-500">@{employee.username}</div>
                                    </div>
                                  </div>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>
                                  {new Date(record.ClockInTime).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(record.ClockInTime).toLocaleDateString('en-IN', {
                                    weekday: 'short'
                                  })}
                                </div>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                  <span className="text-sm text-gray-900">
                                    {new Date(record.ClockInTime).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                                {record.IsLate && (
                                  <div className="mt-1">
                                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Late</span>
                                  </div>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-2 ${record.ClockOutTime ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                                  <span className="text-sm text-gray-900">
                                    {record.ClockOutTime
                                      ? new Date(record.ClockOutTime).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })
                                      : "Not out"}
                                  </span>
                                </div>
                                {record.EarlyClockOut && (
                                  <div className="mt-1">
                                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">Early</span>
                                  </div>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="max-w-xs truncate" title={record.ClockInLocation || 'No location'}>
                                  {record.ClockInLocation || 'No location'}
                                </div>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col space-y-1">
                                  {record.ApprovalStatus !== "Approved" && (
                                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">Pending</span>
                                  )}
                                  {record.ApprovalStatus === "Approved" && (
                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Approved</span>
                                  )}
                                </div>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center space-x-1">
                                  {record.SelfieIn && (
                                    <img
                                      src={getImageUrl(record.SelfieIn)}
                                      alt="In"
                                      className="w-6 h-6 object-cover rounded border border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                                      onClick={() => openImageModal(getImageUrl(record.SelfieIn), 'Clock In')}
                                    />
                                  )}
                                  {record.SelfieOut && (
                                    <img
                                      src={getImageUrl(record.SelfieOut)}
                                      alt="Out"
                                      className="w-6 h-6 object-cover rounded border border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                                      onClick={() => openImageModal(getImageUrl(record.SelfieOut), 'Clock Out')}
                                    />
                                  )}
                                </div>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {record.ApprovalStatus !== "Approved" ? (
                                  <button
                                    onClick={() => approveAttendance(record.Id)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                                  >
                                    Approve
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= LEAVE MANAGEMENT VIEW ================= */}
          {viewMode === "leave-management" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Leave Management</h2>

                {/* Leave Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter:</label>
                  <select
                    value={leaveFilter}
                    onChange={(e) => setLeaveFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Leave Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {loadingLeaveData ? (
                <div className="text-center py-8">
                  <p className="text-blue-600">Loading leave requests...</p>
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No leave requests found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    // Group leave requests by user
                    const groupedRequests = {};
                    const filteredRequests = leaveRequests.filter(request => {
                      if (leaveFilter === "all") return true;
                      return request.status === leaveFilter;
                    });

                    filteredRequests.forEach(request => {
                      if (!groupedRequests[request.userId]) {
                        groupedRequests[request.userId] = {
                          userName: request.userName || `User ${request.userId}`,
                          actionBy: request.actionBy,
                          requests: []
                        };
                      }
                      groupedRequests[request.userId].requests.push(request);
                    });

                    return Object.entries(groupedRequests).map(([userId, userData]) => (
                      <div key={userId} className="bg-white rounded-lg shadow-md overflow-hidden">
                        {/* User Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                              👤 {userData.userName}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-600">
                                Total: {userData.requests.length}
                              </span>
                              <span className="text-yellow-600">
                                Pending: {userData.requests.filter(r => r.status === 'pending').length}
                              </span>
                              <span className="text-green-600">
                                Approved: {userData.requests.filter(r => r.status === 'approved').length}
                              </span>
                              <span className="text-red-600">
                                Rejected: {userData.requests.filter(r => r.status === 'rejected').length}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Leave Requests Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Leave
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Duration
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Period
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Reason
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Applied
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {userData.requests.map((request) => (
                                <tr key={request.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="capitalize text-sm text-gray-900">
                                      {request.leaveType}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-900">
                                      {request.leaveDuration === 'full' ? 'Full Day' :
                                        request.leaveDuration === 'firstHalf' ? 'First Half' :
                                          'Second Half'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    <div className="max-w-xs truncate" title={request.reason}>
                                      {request.reason}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(request.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${request.status === 'approve'
                                      ? 'bg-green-100 text-green-800'
                                      : request.status === 'reject'
                                        ? 'bg-red-100 text-red-800'
                                        : request.status === 'cancelled'
                                          ? 'bg-gray-100 text-gray-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                      {request.status || 'pending'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      {request.status === 'pending' && (
                                        <>
                                          <button
                                            onClick={() => updateLeaveStatus(request.id, 'approve')}
                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={() => updateLeaveStatus(request.id, 'reject')}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                                          >
                                            Reject
                                          </button>
                                          <button
                                            onClick={() => updateLeaveStatus(request.id, 'cancel')}
                                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </>
                                      )}
                                      {(request.status === 'approve' || request.status === 'reject') && (
                                        <button
                                          onClick={() => updateLeaveStatus(request.id, 'cancel')}
                                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                      {request.status === 'cancelled' && (
                                        <span className="text-xs text-gray-500 font-medium">Cancelled by {request.actionBy === 'employee' ? 'Employee' : 'Admin'}</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </>
          )}

          {/* ================= SALARY REPORT VIEW ================= */}
          {viewMode === "salary-report" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Salary Report</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="month-filter" className="text-sm font-medium text-gray-700">
                      Select Month:
                    </label>
                    <input
                      type="month"
                      id="month-filter"
                      value={selectedMonth.toISOString().slice(0, 7)}
                      onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Salary Summary Cards */}
              {!loadingAllData && !loadingSalaryData && Object.keys(allEmployeesData).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Total Employees</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{Object.keys(allEmployeesData).length}</p>
                      </div>
                      <div className="bg-blue-100 rounded-lg p-3">
                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Total Basic Salary</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          ₹{Object.entries(allEmployeesData).reduce((sum, [employeeId]) => {
                            const empSalary = employeesSalaryData.find(emp => emp.id === parseInt(employeeId));
                            return sum + (empSalary?.salary || 0);
                          }, 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-100 rounded-lg p-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Total Leave Deductions</p>
                        <p className="text-3xl font-bold text-red-600 mt-2">
                          -₹{Object.entries(allEmployeesData).reduce((sum, [employeeId, employeeData]) => {
                            const empSalary = employeesSalaryData.find(emp => emp.id === parseInt(employeeId));
                            if (!empSalary?.salary) return sum;

                            const monthlySalary = empSalary.salary;
                            const selectedMonthDays = getDaysInSelectedMonth(selectedMonth.getFullYear(), selectedMonth.getMonth());
                            const dailyWage = monthlySalary / selectedMonthDays;

                            // Check if employee has attendance records for selected month
                            const selectedMonthRecords = getRecordsBySelectedMonth(employeeData.records, selectedMonth);
                            if (selectedMonthRecords.length === 0) return sum; // Skip if no attendance records

                            // Calculate leave deductions only
                            const approvedLeaveDays = approvedLeaves[employeeId] || 0;
                            const rejectedLeaveDays = rejectedLeaves[employeeId] || 0;

                            // Only subtract leaves (approved leaves and double for rejected leaves)
                            const totalLeaveDeduction = approvedLeaveDays + (rejectedLeaveDays * 2);

                            return sum + Math.round(totalLeaveDeduction * dailyWage * 100) / 100;
                          }, 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-red-100 rounded-lg p-3">
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Net Salary to Pay</p>
                        <p className="text-3xl font-bold text-purple-600 mt-2">
                          ₹{Object.entries(allEmployeesData).reduce((sum, [employeeId, employeeData]) => {
                            const empSalary = employeesSalaryData.find(emp => emp.id === parseInt(employeeId));
                            if (!empSalary?.salary) return sum;

                            const monthlySalary = empSalary.salary;
                            const selectedMonthDays = getDaysInSelectedMonth(selectedMonth.getFullYear(), selectedMonth.getMonth());

                            // Check if employee has attendance records for selected month
                            const selectedMonthRecords = getRecordsBySelectedMonth(employeeData.records, selectedMonth);
                            if (selectedMonthRecords.length === 0) return sum; // Skip if no attendance records

                            // Calculate leave deductions only
                            const approvedLeaveDays = approvedLeaves[employeeId] || 0;
                            const rejectedLeaveDays = rejectedLeaves[employeeId] || 0;

                            // Calculate total leave deduction days
                            const totalLeaveDeductionDays = approvedLeaveDays + (rejectedLeaveDays * 2);

                            // Working days after leave deductions (this is what salary is based on)
                            const workingDaysAfterLeaves = selectedMonthDays - totalLeaveDeductionDays;

                            // Salary = Monthly Salary - (Leave Days × Daily Wage)
                            // Or simply: Working Days × Daily Wage
                            const dailyWage = monthlySalary / selectedMonthDays;
                            const calculatedSalary = Math.round(workingDaysAfterLeaves * dailyWage * 100) / 100;

                            return sum + calculatedSalary;
                          }, 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-3">
                        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {loadingAllData || loadingSalaryData ? (
                <div className="text-center py-8">
                  <p className="text-blue-600">Loading salary data...</p>
                </div>
              ) : Object.keys(allEmployeesData).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No salary data found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(allEmployeesData).map(([employeeId, employeeData]) => {
                    // Get selected month records only
                    const selectedMonthRecords = getRecordsBySelectedMonth(employeeData.records, selectedMonth);
                    const approvedDays = selectedMonthRecords.filter(r => r.IsApproved === 1 || r.IsApproved === true).length;
                    const pendingDays = selectedMonthRecords.filter(r => r.IsApproved === 0 || r.IsApproved === false).length;
                    const totalDays = selectedMonthRecords.length;

                    const empSalary = employeesSalaryData.find(emp => emp.id === parseInt(employeeId));
                    const monthlySalary = empSalary?.salary || 0;
                    const selectedMonthDays = getDaysInSelectedMonth(selectedMonth.getFullYear(), selectedMonth.getMonth());

                    // If no attendance records for the month, show 0 for all calculations
                    if (totalDays === 0) {
                      return (
                        <div key={employeeId} className="bg-white rounded-lg shadow-md overflow-hidden">
                          <div className="bg-red-50 px-6 py-4 border-b">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-gray-900">
                                👤 {employeeData.employee.name}
                              </h3>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-red-600 font-semibold">No attendance records for selected month</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-6">
                            <div className="text-center py-8">
                              <p className="text-gray-500">No attendance data available for {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                              <p className="text-sm text-gray-400 mt-2">Salary calculations require attendance records</p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const dailyWage = monthlySalary / selectedMonthDays;

                    const approvedLeaveDays = approvedLeaves[employeeId] || 0;
                    const rejectedLeaveDays = rejectedLeaves[employeeId] || 0;

                    // Total leave deduction days
                    const totalLeaveDeductionDays = approvedLeaveDays + (rejectedLeaveDays * 2);

                    // Working days after leave deductions (this is what salary is based on)
                    const workingDaysAfterLeaves = selectedMonthDays - totalLeaveDeductionDays;

                    // Calculate net salary (based on working days after leaves)
                    const netSalary = Math.round(workingDaysAfterLeaves * dailyWage * 100) / 100;

                    return (
                      <div key={employeeId} className="bg-white rounded-lg shadow-md overflow-hidden">
                        {/* Employee Header */}
                        <div className="bg-green-50 px-6 py-4 border-b">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                              👤 {employeeData.employee.name}
                            </h3>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setSelectedEmployeeForLeaves({
                                    id: employeeId,
                                    name: employeeData.employee.name,
                                    data: employeeData
                                  });
                                  setShowLeaveModal(true);
                                }}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                              >
                                <span>📋</span>
                                Leave View
                              </button>
                              <button
                                onClick={() => {
                                  generateSalarySlipPDF(employeeData, null, approvedLeaves, rejectedLeaves, employeesSalaryData);
                                  showToast("Salary slip generated successfully!", 'success', 3000);
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                              >
                                <span>📄</span>
                                Salary Slip
                              </button>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-600" title="Total days in selected month">
                                  Month Days: {selectedMonthDays}
                                </span>
                                <span className="text-green-600" title="Approved attendance records">
                                  Approved: {approvedDays}
                                </span>
                                <span className="text-yellow-600" title="Pending approval records">
                                  Pending: {pendingDays}
                                </span>
                                <span className="text-orange-600 font-semibold" title="Leave days (deducted from salary)">
                                  Leave Days: {approvedLeaveDays + rejectedLeaveDays}
                                </span>
                                <span className="text-blue-600 font-semibold" title="Working days after leave deductions (salary based on this)">
                                  Working Days: {workingDaysAfterLeaves}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Salary Calculation Table */}
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h4 className="font-semibold text-blue-900 mb-2">Monthly Salary</h4>
                              <p className="text-2xl font-bold text-blue-600">
                                ₹{monthlySalary ? monthlySalary.toLocaleString() : '0'}
                              </p>
                              <p className="text-sm text-gray-600">Fixed monthly salary</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                              <h4 className="font-semibold text-green-900 mb-2">Daily Rate</h4>
                              <p className="text-2xl font-bold text-green-600">
                                {monthlySalary > 0 ? `₹${dailyWage.toFixed(2)}` : '-'}
                              </p>
                              <p className="text-sm text-gray-600">Monthly salary / {selectedMonthDays} days</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4">
                              <h4 className="font-semibold text-purple-900 mb-2">Net Salary</h4>
                              <p className="text-2xl font-bold text-purple-600">
                                {monthlySalary > 0 ? `₹${netSalary.toFixed(2)}` : '-'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {monthlySalary > 0 && (
                                  <>
                                    {workingDaysAfterLeaves} working days × ₹{dailyWage.toFixed(2)}/day
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Leave Deduction Details */}
                          {/* {(approvedLeaveDays > 0 || rejectedLeaveDays > 0) && (
                            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <h4 className="font-semibold text-orange-800 mb-2">Leave Deductions</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {approvedLeaveDays > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium">Approved Leaves:</span> {approvedLeaveDays} day(s) = ₹{Math.round(approvedLeaveDays * dailyWage * 100) / 100}
                                  </div>
                                )}
                                {rejectedLeaveDays > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium">Rejected Leaves (Double Deduction):</span> {rejectedLeaveDays} day(s) × 2 = {rejectedLeaveDays * 2} days = ₹{Math.round(rejectedLeaveDays * 2 * dailyWage * 100) / 100}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 pt-2 border-t border-orange-200 text-sm font-medium">
                                Total Leave Deduction: {totalLeaveDeductionDays} days = ₹{Math.round(totalLeaveDeductionDays * dailyWage * 100) / 100}
                              </div>
                            </div>
                          )} */}

                          {/* Attendance Summary Table - Only Current Month Records */}
                          <div className="mt-6">
                            <h4 className="text-md font-semibold text-gray-800 mb-3">Current Month Attendance Records</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Date
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Clock In
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Clock Out
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {selectedMonthRecords.map((record) => (
                                    <tr key={record.Id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(record.ClockInTime).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(record.ClockInTime).toLocaleTimeString('en-IN', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {record.ClockOutTime
                                          ? new Date(record.ClockOutTime).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                          })
                                          : "Not clocked out"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.IsApproved === 1 || record.IsApproved === true
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                          {record.IsApproved === 1 || record.IsApproved === true ? 'Approved' : 'Pending'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                  {selectedMonthRecords.length === 0 && (
                                    <tr>
                                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        No attendance records for selected month
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ================= SALARY MANAGEMENT VIEW ================= */}
          {viewMode === "salary-management" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Salary Management</h2>
              </div>

              {loadingSalaryData ? (
                <div className="text-center py-8">
                  <p className="text-blue-600">Loading salary data...</p>
                </div>
              ) : employeesSalaryData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No employees found</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Salary
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Updated
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Updated By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {employeesSalaryData.map((employee) => (
                          <tr key={employee.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {employee.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {employee.username}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {editingSalary === employee.id ? (
                                <input
                                  type="number"
                                  defaultValue={employee.salary}
                                  className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Enter salary"
                                  id={`salary-${employee.id}`}
                                />
                              ) : (
                                <div className="text-sm text-gray-900">
                                  ₹{employee.salary ? employee.salary.toLocaleString() : '0'}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {employee.salaryUpdatedAt
                                  ? new Date(employee.salaryUpdatedAt).toLocaleDateString()
                                  : 'Never'
                                }
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {employee.updatedBy || 'System'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {editingSalary === employee.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const salaryInput = document.getElementById(`salary-${employee.id}`);
                                      const salary = parseFloat(salaryInput.value) || 0;

                                      if (salary < 0) {
                                        showToast('Salary cannot be negative', 'error', 3000);
                                        return;
                                      }

                                      updateEmployeeSalary(employee.id, salary);
                                    }}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingSalary(null)}
                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingSalary(employee.id)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================= FINAL REPORT VIEW ================= */}
          {viewMode === "final-report" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Final Report (2026 Onwards)</h2>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Month (Optional)</label>
                  <input
                    type="month"
                    value={typeof selectedMonth === 'string' ? selectedMonth : selectedMonth.toISOString().slice(0, 7)}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    min="2026-01"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => setSelectedMonth('')}
                    className="ml-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
                  >
                    Clear Filter
                  </button>
                </div>

                {!selectedMonth ? (
                  <div className="text-center py-16">
                    <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl">📅</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Select a Month to View Report</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Please select a month from the filter above to view the detailed attendance report with daily status and monthly totals.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                          {(() => {
                            if (selectedMonth) {
                              // Show selected month days
                              const monthString = typeof selectedMonth === 'string' ? selectedMonth : selectedMonth.toISOString().slice(0, 7); // YYYY-MM format
                              const [year, month] = monthString.split('-');
                              const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month) - 1);
                              return Array.from({ length: daysInMonth }, (_, i) => (
                                <th key={i} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {i + 1}
                                </th>
                              ));
                            } else {
                              // Show all months from 2026 onwards
                              const currentYear = new Date().getFullYear();
                              const currentMonth = new Date().getMonth();
                              const months = [];

                              for (let year = 2026; year <= currentYear; year++) {
                                const maxMonth = (year === currentYear) ? currentMonth + 1 : 12;
                                for (let month = 0; month < maxMonth; month++) {
                                  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                                  months.push(
                                    <th key={`${year}-${month}`} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      {monthName}
                                    </th>
                                  );
                                }
                              }
                              return months;
                            }
                          })()}
                          {selectedMonth && (
                            <>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-200">P</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-red-200">L</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-orange-200">F</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {employees.map(emp => (
                          <tr key={emp.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {emp.name}
                            </td>
                            {(() => {
                              if (selectedMonth) {
                                // Show selected month data
                                const monthString = typeof selectedMonth === 'string' ? selectedMonth : selectedMonth.toISOString().slice(0, 7);
                                const [year, month] = monthString.split('-');
                                const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month) - 1);
                                let presentCount = 0;
                                let leaveCount = 0;
                                let festivalCount = 0;

                                const dailyCells = Array.from({ length: daysInMonth }, (_, i) => {
                                  const date = new Date(parseInt(year), parseInt(month) - 1, i + 1);
                                  const dateStr = `${year}-${String(parseInt(month)).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                                  const dayOfWeek = date.getDay();

                                  // Check if it's a future date
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const currentDate = new Date(date);
                                  currentDate.setHours(0, 0, 0, 0);

                                  if (currentDate > today) {
                                    return (
                                      <td key={i} className="px-2 py-4 text-center text-xs text-gray-400 bg-gray-50">
                                        -
                                      </td>
                                    );
                                  }

                                  // Check if it's Sunday
                                  if (dayOfWeek === 0) {
                                    return (
                                      <td key={i} className="px-2 py-4 text-center text-xs text-gray-400 bg-gray-50">
                                        S
                                      </td>
                                    );
                                  }

                                  // Check leave
                                  const employeeLeaves = detailedLeaveInfo[emp.id] || [];
                                  const hasLeave = employeeLeaves.some(leave => leave.date === dateStr);

                                  if (hasLeave) {
                                    leaveCount++;
                                    return (
                                      <td key={i} className="px-2 py-4 text-center text-xs font-medium text-red-600 bg-red-50">
                                        L
                                      </td>
                                    );
                                  }

                                  // Check attendance
                                  const employeeRecords = allEmployeesData[emp.id]?.records || [];
                                  const attendanceRecord = employeeRecords.find(record =>
                                    new Date(record.ClockInTime).toDateString() === date.toDateString()
                                  );

                                  if (attendanceRecord && attendanceRecord.ClockInTime) {
                                    presentCount++;
                                    return (
                                      <td key={i} className="px-2 py-4 text-center text-xs font-medium text-green-600 bg-green-50">
                                        P
                                      </td>
                                    );
                                  }

                                  festivalCount++;
                                  return (
                                    <td key={i} className="px-2 py-4 text-center text-xs font-medium text-orange-600 bg-orange-50">
                                      F
                                    </td>
                                  );
                                });

                                return [
                                  ...dailyCells,
                                  <td key="total-p" className="px-4 py-4 text-center text-sm font-bold text-green-700 bg-green-50">
                                    {presentCount}
                                  </td>,
                                  <td key="total-l" className="px-4 py-4 text-center text-sm font-bold text-red-700 bg-red-50">
                                    {leaveCount}
                                  </td>,
                                  <td key="total-f" className="px-4 py-4 text-center text-sm font-bold text-orange-700 bg-orange-50">
                                    {festivalCount}
                                  </td>
                                ];
                              } else {
                                // Show monthly summary from 2026 onwards
                                const currentYear = new Date().getFullYear();
                                const currentMonth = new Date().getMonth();
                                const months = [];

                                for (let year = 2026; year <= currentYear; year++) {
                                  const maxMonth = (year === currentYear) ? currentMonth + 1 : 12;
                                  for (let month = 0; month < maxMonth; month++) {
                                    const monthStart = new Date(year, month, 1);
                                    const monthEnd = new Date(year, month + 1, 0);
                                    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

                                    // Count days in month
                                    const daysInMonth = getDaysInMonth(year, month);
                                    let workingDays = 0;
                                    let presentDays = 0;
                                    let leaveDays = 0;

                                    for (let day = 1; day <= daysInMonth; day++) {
                                      const currentDate = new Date(year, month, day);
                                      const dayOfWeek = currentDate.getDay();
                                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                                      // Skip Sundays
                                      if (dayOfWeek === 0) continue;

                                      // Skip future dates
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      const checkDate = new Date(currentDate);
                                      checkDate.setHours(0, 0, 0, 0);
                                      if (checkDate > today) continue;

                                      workingDays++;

                                      // Check leave
                                      const employeeLeaves = detailedLeaveInfo[emp.id] || [];
                                      const hasLeave = employeeLeaves.some(leave => leave.date === dateStr);

                                      if (hasLeave) {
                                        leaveDays++;
                                      } else {
                                        // Check attendance
                                        const employeeRecords = allEmployeesData[emp.id]?.records || [];
                                        const attendanceRecord = employeeRecords.find(record => {
                                          const recordDate = new Date(record.ClockInTime);
                                          return recordDate.toDateString() === currentDate.toDateString();
                                        });

                                        if (attendanceRecord && attendanceRecord.ClockInTime) {
                                          presentDays++;
                                        }
                                      }
                                    }

                                    const attendancePercentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
                                    const cellClass = attendancePercentage >= 90 ? 'bg-green-50 text-green-600' :
                                      attendancePercentage >= 70 ? 'bg-yellow-50 text-yellow-600' :
                                        'bg-red-50 text-red-600';

                                    months.push(
                                      <td key={`${year}-${month}`} className={`px-2 py-4 text-center text-xs font-medium ${cellClass}`}>
                                        {attendancePercentage}%
                                      </td>
                                    );
                                  }
                                }
                                return months;
                              }
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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

      {/* Leave Details Modal */}
      {showLeaveModal && selectedEmployeeForLeaves && (
        <div
          className="fixed inset-0 bg-[#0000009b] bg-opacity-75 flex items-center justify-center z-50 p-1"
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="relative max-w-[90vw] max-h-full bg-white rounded-xl overflow-hidden shadow-2xl w-full max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-3 border-b bg-linear-to-r from-purple-50 to-blue-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>📋</span>
                  Leave Details - {selectedEmployeeForLeaves.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Complete leave history and details
                </p>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 overflow-y-auto max-h-[60vh]">
              {(() => {
                const employeeLeaves = detailedLeaveInfo[selectedEmployeeForLeaves.id] || [];
                const approvedLeaveDays = approvedLeaves[selectedEmployeeForLeaves.id] || 0;
                const rejectedLeaveDays = rejectedLeaves[selectedEmployeeForLeaves.id] || 0;
                const totalLeaveDays = approvedLeaveDays + rejectedLeaveDays;

                if (employeeLeaves.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✅</span>
                      </div>
                      <h4 className="text-lg font-semibold text-green-800 mb-2">No Leaves Taken</h4>
                      <p className="text-gray-600">This employee has not taken any leave this month.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-600 text-sm font-medium">Total Leave Entries</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{employeeLeaves.length}</p>
                          </div>
                          <div className="bg-blue-100 rounded-lg p-3">
                            <span className="text-2xl">📊</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-600 text-sm font-medium">Approved Leave Days</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">{approvedLeaveDays}</p>
                          </div>
                          <div className="bg-green-100 rounded-lg p-3">
                            <span className="text-2xl">✅</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-red-600 text-sm font-medium">Rejected Leave Days</p>
                            <p className="text-2xl font-bold text-red-900 mt-1">{rejectedLeaveDays}</p>
                            <p className="text-xs text-red-600 mt-1">(Double deduction: {rejectedLeaveDays * 2} days)</p>
                          </div>
                          <div className="bg-red-100 rounded-lg p-3">
                            <span className="text-2xl">❌</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-orange-600 text-sm font-medium">Total Salary Deduction</p>
                            <p className="text-2xl font-bold text-orange-900 mt-1">
                              ₹{(() => {
                                const empSalary = employeesSalaryData.find(emp => emp.id === parseInt(selectedEmployeeForLeaves.id));
                                const monthlySalary = empSalary?.salary || 20000;
                                const currentMonthDays = getCurrentMonthDays();
                                const dailyWage = monthlySalary / currentMonthDays;
                                const totalDeductionDays = approvedLeaveDays + (rejectedLeaveDays * 2);
                                const exactTotal = totalDeductionDays * dailyWage;
                                return exactTotal.toFixed(2).toLocaleString();
                              })()}
                            </p>
                          </div>
                          <div className="bg-orange-100 rounded-lg p-3">
                            <span className="text-2xl">💰</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Leave Details List */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Leave History</h4>
                      <div className="space-y-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {employeeLeaves.map((leave, index) => {
                          const isRejected = leave.status === 'reject' || leave.status === 'rejected';
                          const deductionDays = isRejected ? (leave.type === 'Full Day' ? 2 : 1) : (leave.type === 'Full Day' ? 1 : 0.5);
                          return (
                            <div key={index} className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${isRejected ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900">
                                      {new Date(leave.date).getDate()}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {new Date(leave.date).toLocaleDateString('en-IN', { month: 'short' })}
                                    </div>
                                  </div>
                                  <div className="h-12 w-px bg-gray-200"></div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-3 py-1 text-xs rounded-full font-medium border ${leave.type === 'Full Day'
                                        ? 'bg-red-100 text-red-800 border-red-200'
                                        : 'bg-orange-100 text-orange-800 border-orange-200'
                                        }`}>
                                        {leave.type === 'Full Day' ? '📅 Full Day' :
                                          leave.type === 'First Half' ? '🌅 First Half' : '🌆 Second Half'}
                                      </span>
                                      <span className={`px-3 py-1 text-xs rounded-full font-medium border ${isRejected
                                        ? 'bg-red-100 text-red-800 border-red-200'
                                        : 'bg-green-100 text-green-800 border-green-200'
                                        }`}>
                                        {isRejected ? '❌ Rejected' : '✅ Approved'}
                                      </span>
                                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                        {leave.leaveType}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-900">
                                      {new Date(leave.date).toLocaleDateString('en-IN', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </div>
                                    {isRejected && (
                                      <div className="text-xs text-red-600 mt-1 font-medium">
                                        ⚠️ Double deduction applied: {deductionDays} days
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600 mb-1">
                                    {deductionDays} day{deductionDays !== 1 ? 's' : ''} deduction
                                  </div>
                                  <div className="text-sm font-medium text-red-600">
                                    -₹{(() => {
                                      const empSalary = employeesSalaryData.find(emp => emp.id === parseInt(selectedEmployeeForLeaves.id));
                                      const monthlySalary = empSalary?.salary || 20000;
                                      const currentMonthDays = getCurrentMonthDays();
                                      const dailyWage = monthlySalary / currentMonthDays;
                                      const exactAmount = deductionDays * dailyWage;
                                      return exactAmount.toFixed(2);
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Notification Toast */}
      {/* <LeaveNotificationToast
        pendingLeaves={pendingLeaveRequests}
        isVisible={showLeaveNotification}
        onClose={() => setShowLeaveNotification(false)}
        onApprove={async (leaveId) => {
          await updateLeaveStatus(leaveId, 'approve');
        }}
        onReject={async (leaveId) => {
          await updateLeaveStatus(leaveId, 'reject');
        }}
        onGoToLeaveManagement={() => {
          setShowLeaveNotification(false);
          setViewMode('leave-management');
        }}
      /> */}

      {/* Toast Container */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            } text-white`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}