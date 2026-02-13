"use client";
import { useState, useEffect } from "react";
import { getUserFromToken } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { RouteGuard } from "@/components/RouteGuard";
import ConfettiAnimation from "@/components/ConfettiAnimation";
import DashboardLayout from "@/components/DashboardLayout";

// Helper function to convert file path to API URL
const getImageUrl = (filePath) => {
  if (!filePath) return null;
  // Extract filename from D:\attendanceImage\filename
  const filename = filePath.split('\\').pop();
  return `/api/images?filename=${filename}`;
};

export default function Dashboard() {
  const { user: authUser } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [canClockIn, setCanClockIn] = useState(true);
  const [approvalPending, setApprovalPending] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (authUser) {
      fetchUserDetails();
      fetchAttendance(authUser.id);
    } else {
      setLoading(false);
    }
  }, [authUser]);

  // Check if user had a perfect day (clock-in before 9:40 AM AND clock-out after 6:30 PM)
  const checkPerfectDay = (attendanceData) => {
    const today = new Date().toDateString();
    const todayRecord = attendanceData.find(record =>
      new Date(record.ClockInTime).toDateString() === today &&
      record.ClockOutTime // Must have clocked out
    );

    if (todayRecord) {
      const clockInTime = new Date(todayRecord.ClockInTime);
      const clockOutTime = new Date(todayRecord.ClockOutTime);
      
      const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
      const clockOutMinutes = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
      
      // Check: Clock-in before 9:40 AM (580 minutes) AND Clock-out after 6:30 PM (1110 minutes)
      const isEarlyClockIn = clockInMinutes < 580; // 9:40 AM = 9 * 60 + 40 = 580 minutes
      const isLateClockOut = clockOutMinutes >= 1110; // 6:30 PM = 18 * 60 + 30 = 1110 minutes
      
      if (isEarlyClockIn && isLateClockOut) {
        setShowConfetti(true);
        return true;
      }
    }
    
    return false;
  };

  const fetchUserDetails = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUserDetails(data);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchAttendance = async (userId) => {
    try {
      const res = await fetch("/api/attendance/report", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAttendance(data);

        // Filter to show only today's attendance records
        const today = new Date().toDateString();
        const todayRecords = data.filter(record =>
          new Date(record.ClockInTime).toDateString() === today
        );
        
        // Set attendance to only today's records
        setAttendance(todayRecords);

        // Check if user had a perfect day
        checkPerfectDay(todayRecords);

        // Check if user is currently clocked in and if approval is pending
        const todayAttendance = todayRecords.find(record =>
          new Date(record.ClockInTime).toDateString() === today
        );

        const isClockedInToday = !!todayAttendance && !todayAttendance.ClockOutTime;
        const isApprovalPending = isClockedInToday && (todayAttendance.IsApproved === 0 || todayAttendance.IsApproved === false);
        
        // Check for any pending approvals from previous days (use full data for this check)
        const hasPendingApprovalFromPreviousDays = data.some(record =>
          !record.ClockOutTime && (record.IsApproved === 0 || record.IsApproved === false) &&
          new Date(record.ClockInTime).toDateString() !== today
        );
        
        setClockedIn(isClockedInToday && !isApprovalPending);
        setCanClockIn(!isClockedInToday && !hasPendingApprovalFromPreviousDays); // Can only clock in if not already clocked in today AND no pending approvals
        setApprovalPending(isApprovalPending || hasPendingApprovalFromPreviousDays);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const openImageModal = (imagePath, type) => {
    setSelectedImage({ path: imagePath, type: type });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setShowImageModal(false);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        localStorage.removeItem("token");
        window.location.href = "/";
      } else {
        showToast("Logout failed", 'error', 3000);
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, remove token and redirect
      localStorage.removeItem("token");
      window.location.href = "/";
    }
  };

  const startCamera = async (mode) => {
    try {
      setCameraMode(mode);
      setShowCameraModal(true);
      setCapturedImage(null);
      
      let stream;
      let cameraAttempts = 0;
      const maxAttempts = 2;

      while (cameraAttempts < maxAttempts) {
        try {
          console.log(`Camera attempt ${cameraAttempts + 1}`);
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 }
            }
          });
          console.log('Camera access granted');
          break;
        } catch (cameraError) {
          console.error(`Camera attempt ${cameraAttempts + 1} failed:`, cameraError);
          cameraAttempts++;

          if (cameraAttempts >= maxAttempts) {
            if (cameraError.name === 'NotAllowedError' || cameraError.name === 'PermissionDeniedError') {
              showToast('Camera permission is required for attendance.\n\nTo enable camera:\n1. Click the lock/icon in your browser address bar\n2. Allow camera access\n3. Refresh the page\n\nOr use Chrome/Safari for better compatibility.', 'error', 8000);
              closeCameraModal();
              return;
            } else if (cameraError.name === 'NotFoundError' || cameraError.name === 'DevicesNotFoundError') {
              showToast('No camera found on this device. Please use a device with camera to clock ' + mode + '.', 'error', 5000);
              closeCameraModal();
              return;
            } else {
              showToast('Camera error: ' + (cameraError.message || 'Unknown error') + '. Please try again or use a different browser.', 'error', 5000);
              closeCameraModal();
              return;
            }
          } else {
            const retry = confirm('Camera access needed for attendance. Allow camera access and click OK to retry.');
            if (!retry) {
              showToast('Camera access is required for clock ' + mode + '. Please enable camera permissions and refresh the page.', 'warning', 6000);
              closeCameraModal();
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (!stream) {
        showToast('Unable to access camera. Please check your browser settings and try again.', 'error', 5000);
        closeCameraModal();
        return;
      }

      setCameraStream(stream);
      
      // Set video stream after modal is open
      setTimeout(() => {
        const video = document.getElementById('camera-video');
        if (video) {
          video.srcObject = stream;
        }
      }, 100);
      
    } catch (error) {
      console.error('Camera start error:', error);
      showToast('Failed to start camera: ' + error.message, 'error', 5000);
      closeCameraModal();
    }
  };

  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCameraMode('');
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    try {
      const video = document.getElementById('camera-video');
      const canvas = document.getElementById('camera-canvas');
      
      if (!video || !canvas) {
        showToast('Camera not ready. Please try again.', 'error', 3000);
        return;
      }

      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
      
      // Stop camera stream after capture
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      
    } catch (error) {
      console.error('Photo capture error:', error);
      showToast('Failed to capture photo. Please try again.', 'error', 3000);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera(cameraMode);
  };

  const confirmPhoto = async () => {
    if (!capturedImage) {
      showToast('No photo captured. Please try again.', 'error', 3000);
      return;
    }

    // Prevent multiple submissions
    if (isProcessing) {
      showToast('Processing in progress. Please wait...', 'warning', 2000);
      return;
    }

    setIsProcessing(true);

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const selfieFile = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });

      // Get user location
      let lat, lng;
      try {
        if (!navigator.geolocation) {
          lat = 23.0225;
          lng = 72.5714;
        } else {
          const position = await new Promise((resolve) => {
            const options = {
              enableHighAccuracy: false,
              timeout: 20000,
              maximumAge: 60000
            };

            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos.coords),
              () => resolve({ lat: 23.0225, lng: 72.5714 }),
              options
            );
          });

          lat = position?.lat || position?.latitude || 23.0225;
          lng = position?.lng || position?.longitude || 72.5714;
          lat = Number(lat);
          lng = Number(lng);

          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            lat = 23.0225;
            lng = 72.5714;
          }
        }
      } catch (locationError) {
        lat = 23.0225;
        lng = 72.5714;
      }

      let additionalData = {};
      
      if (cameraMode === 'clock-in') {
        const now = new Date();
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        const isLateClockIn = totalMinutes > 580;
        
        if (isLateClockIn) {
          const lateClockInReason = prompt("Late clock-in detected (after 9:40 AM). Please provide a reason for late arrival:");
          if (!lateClockInReason || lateClockInReason.trim() === '') {
            showToast("Reason is required for late clock-in", 'error', 3000);
            return;
          }
          additionalData.lateClockInReason = lateClockInReason.trim();
        }
      } else {
        const now = new Date();
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        const isEarlyClockOut = totalMinutes < 1110;
        
        if (isEarlyClockOut) {
          const earlyClockOutReason = prompt("Early clock-out detected (before 6:30 PM). Please provide a reason for early departure:");
          if (!earlyClockOutReason || earlyClockOutReason.trim() === '') {
            showToast("Reason is required for early clock-out", 'error', 3000);
            return;
          }
          additionalData.earlyClockOutReason = earlyClockOutReason.trim();
        }
      }

      // Send request
      const formData = new FormData();
      formData.append("selfie", selfieFile);
      formData.append("lat", lat.toString());
      formData.append("lng", lng.toString());
      
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });

      const endpoint = cameraMode === 'clock-in' ? '/api/attendance/clock-in' : '/api/attendance/clock-out';
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        let message = cameraMode === 'clock-in' ? "Clock in successful!" : "Clock out successful!";
        
        if (cameraMode === 'clock-in' && data.isLate) {
          message = data.message || "Late clock-in recorded";
        } else if (cameraMode === 'clock-out' && data.earlyClockOut) {
          message += " (Early Clock-out)";
        }
        
        // Check for perfect day on clock-out
        if (cameraMode === 'clock-out') {
          const now = new Date();
          const clockOutMinutes = now.getHours() * 60 + now.getMinutes();
          const isLateClockOut = clockOutMinutes >= 1110;
          
          const today = new Date().toDateString();
          const todayRecord = attendance.find(record =>
            new Date(record.ClockInTime).toDateString() === today
          );
          
          if (todayRecord && isLateClockOut) {
            const clockInTime = new Date(todayRecord.ClockInTime);
            const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
            const isEarlyClockIn = clockInMinutes < 580;
            
            if (isEarlyClockIn) {
              setShowConfetti(true);
              message += " 🎉 Perfect Day!";
            }
          }
        }
        
        showToast(message, 'success', 3000);
        fetchAttendance(authUser.id);
        closeCameraModal();
      } else {
        const data = await res.json();
        showToast(data.error || "Clock " + cameraMode + " failed", 'error', 5000);
      }
    } catch (error) {
      console.error('Clock ' + cameraMode + ' error:', error);
      showToast("Clock " + cameraMode + " error: " + error.message, 'error', 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const captureSelfieAndClockIn = () => {
    // Prevent multiple clicks
    if (isProcessing) {
      showToast('Processing in progress. Please wait...', 'warning', 2000);
      return;
    }
    startCamera('clock-in');
  };

  const captureSelfieAndClockOut = () => {
    // Prevent multiple clicks
    if (isProcessing) {
      showToast('Processing in progress. Please wait...', 'warning', 2000);
      return;
    }
    startCamera('clock-out');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <RouteGuard>
      <DashboardLayout>
        {/* Confetti Animation */}
        <ConfettiAnimation show={showConfetti} />
              {/* Header */}
              <div className="mb-6 lg:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Attendance Dashboard</h1>
                    <p className="text-sm sm:text-base text-gray-600">Manage your attendance and view records</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Clock In</h3>
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Start your work day</p>
                  <button
                    onClick={captureSelfieAndClockIn}
                    disabled={!canClockIn || isProcessing}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${!canClockIn || isProcessing
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                  >
                    {isProcessing ? "Processing..." : (
                      clockedIn ? "Already Clocked In" : 
                      approvalPending ? "Approval Pending - Cannot Clock In" : 
                      "Clock In"
                    )}
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Clock Out</h3>
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">End your work day</p>
                  
                  {approvalPending ? (
                    <div className="w-full px-4 py-3 rounded-lg font-medium text-sm sm:text-base bg-orange-100 text-orange-700 border border-orange-200">
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Awaiting Admin Approval
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={captureSelfieAndClockOut}
                      disabled={!clockedIn || isProcessing}
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${!clockedIn || isProcessing
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                    >
                      {isProcessing ? "Processing..." : "Clock Out"}
                    </button>
                  )}
                </div>
              </div>

              {/* Attendance Records */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Attendance Records</h2>
                  <p className="text-sm text-gray-600 mt-1">Your attendance history</p>
                </div>

                {/* Mobile Table View */}
                <div className="lg:hidden">
                  <div className="divide-y divide-gray-200">
                    {attendance.map((record, index) => (
                      <div key={index} className="p-4 space-y-3">
                        {/* Date and Status */}
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">
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
                          </div>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.ClockOutTime
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                            }`}>
                            {record.ClockOutTime ? "Completed" : "Active"}
                          </span>
                        </div>

                        {/* Times */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Clock In</div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.ClockInTime ? new Date(record.ClockInTime).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }) : "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Clock Out</div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.ClockOutTime ? new Date(record.ClockOutTime).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }) : "-"}
                            </div>
                          </div>
                        </div>

                        {/* Approval Status */}
                        {/* Late Arrival - Pending Approval */}
                        {(record.IsLate === 1 || record.IsLate === true) && (record.IsApproved === 0 || record.IsApproved === false) && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-amber-800">Late Arrival - Pending Approval</h4>
                                <p className="text-xs text-amber-700 mt-1">{record.ApprovalMessage || "Waiting for admin approval"}</p>
                                {record.LateClockInReason && typeof record.LateClockInReason === 'string' && record.LateClockInReason.trim() !== '' && (
                                  <div className="mt-2 p-2 bg-amber-100 rounded-md">
                                    <p className="text-xs font-medium text-amber-900">Reason Provided:</p>
                                    <p className="text-sm text-amber-800 mt-1">{record.LateClockInReason}</p>
                                  </div>
                                )}
                                {!record.LateClockInReason && (
                                  <div className="mt-2 p-2 bg-amber-100 rounded-md">
                                    <p className="text-xs font-medium text-amber-900">Status:</p>
                                    <p className="text-sm text-amber-800 mt-1">No reason provided yet</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Late Clock-in Reason (when approved) */}
                        {(record.IsLate === 1 || record.IsLate === true) && (record.IsApproved === 1 || record.IsApproved === true) && record.LateClockInReason && typeof record.LateClockInReason === 'string' && record.LateClockInReason.trim() !== '' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-blue-800">Late Arrival - Approved</h4>
                                <div className="mt-2 p-2 bg-blue-100 rounded-md">
                                  <p className="text-xs font-medium text-blue-900">Reason:</p>
                                  <p className="text-sm text-blue-800 mt-1">{record.LateClockInReason}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Early Clock-out Reason */}
                        {(record.EarlyClockOut === 1 || record.EarlyClockOut === true) && record.EarlyClockOutReason && typeof record.EarlyClockOutReason === 'string' && record.EarlyClockOutReason.trim() !== '' && (
                          <div className={`${(record.IsApproved === 0 || record.IsApproved === false) ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"} rounded-lg p-3`}>
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0">
                                {(record.IsApproved === 0 || record.IsApproved === false) ? (
                                  <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className={`text-sm font-semibold ${(record.IsApproved === 0 || record.IsApproved === false) ? "text-orange-800" : "text-green-800"}`}>
                                  Early Clock-out - {(record.IsApproved === 0 || record.IsApproved === false) ? "Pending Approval" : "Approved"}
                                </h4>
                                {(record.IsApproved === 0 || record.IsApproved === false) && (
                                  <p className="text-xs text-orange-700 mt-1">Waiting for admin approval</p>
                                )}
                                <div className="mt-2 p-2 bg-white rounded-md border border-gray-200">
                                  <p className="text-xs font-medium text-gray-700">Reason Provided:</p>
                                  <p className={`text-sm mt-1 ${(record.IsApproved === 0 || record.IsApproved === false) ? "text-orange-800" : "text-green-800"}`}>
                                    {record.EarlyClockOutReason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Photos */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Photos</div>
                          <div className="flex space-x-2">
                            {record.SelfieIn && (
                              <img
                                src={getImageUrl(record.SelfieIn)}
                                alt="Clock In"
                                className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => openImageModal(getImageUrl(record.SelfieIn), 'Clock In')}
                              />
                            )}
                            {record.SelfieOut && (
                              <img
                                src={getImageUrl(record.SelfieOut)}
                                alt="Clock Out"
                                className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => openImageModal(getImageUrl(record.SelfieOut), 'Clock Out')}
                              />
                            )}
                            {!record.SelfieIn && !record.SelfieOut && (
                              <span className="text-gray-400 text-sm">No photos</span>
                            )}
                          </div>
                        </div>

                        {/* Location */}
                        {(record.ClockInLocation || record.ClockOutLocation) && (
                          <div>
                            <div className="text-xs text-gray-500 mb-2">Location</div>
                            <div className="space-y-1">
                              {record.ClockInLocation && (
                                <div>
                                  <span className="text-xs text-gray-500">In: </span>
                                  <div className="text-xs text-gray-900 break-words">
                                    {record.ClockInLocation}
                                  </div>
                                </div>
                              )}
                              {record.ClockOutLocation && (
                                <div>
                                  <span className="text-xs text-gray-500">Out: </span>
                                  <div className="text-xs text-gray-900 break-words">
                                    {record.ClockOutLocation}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
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
                            Photos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendance.map((record, index) => (
                          record?.ApprovalStatus === "Approved" ? (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="font-medium">
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.ClockInTime ? new Date(record.ClockInTime).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.ClockOutTime ? new Date(record.ClockOutTime).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex space-x-2">
                                  {record.SelfieIn && (
                                    <img
                                      src={getImageUrl(record.SelfieIn)}
                                      alt="Clock In"
                                      className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => openImageModal(getImageUrl(record.SelfieIn), 'Clock In')}
                                    />
                                  )}
                                  {record.SelfieOut && (
                                    <img
                                      src={getImageUrl(record.SelfieOut)}
                                      alt="Clock Out"
                                      className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => openImageModal(getImageUrl(record.SelfieOut), 'Clock Out')}
                                    />
                                  )}
                                  {!record.SelfieIn && !record.SelfieOut && (
                                    <span className="text-gray-400 text-xs">No photos</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="max-w-xs">
                                  {record.ClockInLocation && (
                                    <div className="mb-1">
                                      <span className="text-xs text-gray-500">In: </span>
                                      <div className="text-xs text-gray-900 truncate">
                                        {record.ClockInLocation}
                                      </div>
                                    </div>
                                  )}
                                  {record.ClockOutLocation && (
                                    <div>
                                      <span className="text-xs text-gray-500">Out: </span>
                                      <div className="text-xs text-gray-900 truncate">
                                        {record.ClockOutLocation}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {record.IsLate && record.IsApproved ? (
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.ClockOutTime
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                    }`}>
                                    {record.ClockOutTime ? "Completed" : "Active"}
                                  </span>
                                ) : (
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.ClockOutTime
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                    }`}>
                                    {record.ClockOutTime ? "Completed" : "Active"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ) : (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-center" colSpan="6">
                                <div className="space-y-2">
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    Pending
                                  </span>
                                  <div className="text-xs text-yellow-700">
                                    ⚠️ {record.ApprovalMessage || "Contact admin for approval"}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

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

        {/* Camera Modal */}
        {showCameraModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {cameraMode === 'clock-in' ? 'Clock In - Take Photo' : 'Clock Out - Take Photo'}
                  </h3>
                  <button
                    onClick={closeCameraModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Camera View or Captured Image */}
                <div className="relative mb-4">
                  {!capturedImage ? (
                    <div className="relative">
                      <video
                        id="camera-video"
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 bg-black rounded-lg object-cover"
                      />
                      {!cameraStream && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Starting camera...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  )}
                </div>

                {/* Hidden Canvas for Photo Capture */}
                <canvas id="camera-canvas" className="hidden" />

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!capturedImage ? (
                    <>
                      <button
                        onClick={capturePhoto}
                        disabled={!cameraStream || isProcessing}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {isProcessing ? "Processing..." : "Capture Photo"}
                      </button>
                      <button
                        onClick={closeCameraModal}
                        className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={retakePhoto}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-medium transition-colors"
                      >
                        Retake
                      </button>
                      <button
                        onClick={confirmPhoto}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isProcessing ? "Processing..." : (cameraMode === 'clock-in' ? 'Clock In' : 'Clock Out')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center p-4 rounded-lg shadow-lg border ${toast.type === 'success' ? 'bg-green-500 text-white border-green-600' :
                toast.type === 'error' ? 'bg-red-500 text-white border-red-600' :
                  toast.type === 'warning' ? 'bg-yellow-500 text-black border-yellow-600' :
                    'bg-blue-500 text-white border-blue-600'
                }`}
            >
              <div className="shrink-0 mr-3">
                {toast.type === 'success' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414 1.414l-8.485 8.486a1 1 0 01-1.414 0L10 11.414l8.485-8.486a1 1 0 010-1.414 1.414z" clipRule="evenodd" />
                  </svg>
                )}
                {toast.type === 'error' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 10.586l-8.293 8.293a1 1 0 111.414 1.414L10 12.414l8.293-8.293a1 1 0 111.414-1.414L10 10.586l-8.293 8.293z" clipRule="evenodd" />
                  </svg>
                )}
                {toast.type === 'warning' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 1.5-1.36 1.5-2.354 0-3.972-3-3.972-1.5 0-2.354-1.5-3.972-3.972-4.354 0-7.657 2.929-4.354 3.972-4.354 3.972 0 3.972 3 4.354 0 7.657-2.929 4.354-3.972 0z" clipRule="evenodd" />
                  </svg>
                )}
                {toast.type === 'info' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm1-1V4a1 1 0 00-2h-1a1 1 0 00-2h12a1 1 0 00-2h-1a1 1 0 00-2zM9 9a1 1 0 000 2v3a1 1 0 002h2a1 1 0 002-2V9a1 1 0 00-2-2H9a1 1 0 00-2-2z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-4 shrink-0 text-white hover:opacity-80 transition-opacity"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 10.586l-8.293 8.293a1 1 0 01-1.414 1.414L10 12.414l8.293-8.293a1 1 0 111.414-1.414L10 10.586l-8.293 8.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </DashboardLayout>
    </RouteGuard>
  );
};
