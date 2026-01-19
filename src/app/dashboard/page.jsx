"use client";
import { useState, useEffect } from "react";
import { getUserFromToken } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { RouteGuard } from "@/components/RouteGuard";

export default function Dashboard() {
  const { user: authUser } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (authUser) {
      fetchUserDetails();
      fetchAttendance(authUser.id);
    } else {
      setLoading(false);
    }
  }, [authUser]);

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

        // Check if user is currently clocked in
        const today = new Date().toDateString();
        const todayAttendance = data.find(record =>
          new Date(record.ClockInTime).toDateString() === today
        );

        setClockedIn(!!todayAttendance && !todayAttendance.ClockOutTime);
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

  const captureSelfieAndClockIn = async () => {
    try {
      // Check camera permission first with better error handling
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
          break; // Success, exit loop
        } catch (cameraError) {
          console.error(`Camera attempt ${cameraAttempts + 1} failed:`, cameraError);
          cameraAttempts++;

          if (cameraAttempts >= maxAttempts) {
            // Final attempt failed
            if (cameraError.name === 'NotAllowedError' || cameraError.name === 'PermissionDeniedError') {
              showToast('Camera permission is required for attendance.\n\nTo enable camera:\n1. Click the lock/icon in your browser address bar\n2. Allow camera access\n3. Refresh the page\n\nOr use Chrome/Safari for better compatibility.', 'error', 8000);
              return;
            } else if (cameraError.name === 'NotFoundError' || cameraError.name === 'DevicesNotFoundError') {
              showToast('No camera found on this device. Please use a device with camera to clock in.', 'error', 5000);
              return;
            } else if (cameraError.name === 'NotReadableError' || cameraError.name === 'TrackStartError') {
              showToast('Camera is already in use by another application. Please close other apps and try again.', 'error', 5000);
              return;
            } else if (cameraError.name === 'OverconstrainedError' || cameraError.name === 'ConstraintNotSatisfiedError') {
              showToast('Camera does not support the required settings. Please try again.', 'error', 4000);
              return;
            } else {
              showToast('Camera error: ' + (cameraError.message || 'Unknown error') + '. Please try again or use a different browser.', 'error', 5000);
              return;
            }
          } else {
            // First attempt failed, ask user to retry
            const retry = confirm('Camera access needed for attendance. Allow camera access and click OK to retry.');
            if (!retry) {
              showToast('Camera access is required for clock in. Please enable camera permissions and refresh the page.', 'warning', 6000);
              return;
            }
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // If we couldn't get stream after all attempts
      if (!stream) {
        showToast('Unable to access camera. Please check your browser settings and try again.', 'error', 5000);
        return;
      }

      // Create video element for camera stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Create canvas to capture photo
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);

      // Stop camera stream
      stream.getTracks().forEach(track => track.stop());

      // Convert canvas to blob and then to file
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      const selfieFile = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });

      // Get user location with mobile-friendly fallbacks and permission handling
      let lat, lng;
      try {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
          console.log("Geolocation not supported, using defaults");
          lat = 23.0225;
          lng = 72.5714;
        } else {
          // Show location permission request message
          console.log('Requesting location permission for clock-in...');
          const position = await new Promise((resolve, reject) => {
            const options = {
              enableHighAccuracy: false, // Better for mobile
              timeout: 20000, // Longer timeout for mobile
              maximumAge: 60000 // Accept cached location
            };

            navigator.geolocation.getCurrentPosition(
              (pos) => {
                console.log("Location received successfully:", pos.coords);
                resolve(pos.coords);
              },
              (error) => {
                console.log("Geolocation error:", error);
                let message = 'Location access denied. Using default location (Ahmedabad).';

                if (error.code === 1) { // PERMISSION_DENIED
                  message = 'Location permission denied. Using default location (Ahmedabad).\n\nFor accurate attendance tracking:\n� Enable location permissions in your browser settings\n� Click the location icon in your browser address bar\n� Allow location access for this site';
                } else if (error.code === 2) { // POSITION_UNAVAILABLE
                  message = 'Location unavailable. Using default location (Ahmedabad).\n\nPlease check your GPS/location services.';
                } else if (error.code === 3) { // TIMEOUT
                  message = 'Location request timed out. Using default location (Ahmedabad).\n\nPlease try again with better network connectivity.';
                }

                // Show user-friendly message but continue with defaults
                console.log(message);

                // Always resolve with defaults instead of rejecting
                resolve({ lat: 23.0225, lng: 72.5714 });
              },
              options
            );
          });

          // Multiple fallbacks for mobile compatibility
          lat = position?.lat || position?.latitude || 23.0225;
          lng = position?.lng || position?.longitude || 72.5714;

          // Convert to numbers and validate
          lat = Number(lat);
          lng = Number(lng);

          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            console.log("Invalid coordinates, using defaults");
            lat = 23.0225;
            lng = 72.5714;
          }
        }
      } catch (locationError) {
        console.error("Location error:", locationError);
        lat = 23.0225;
        lng = 72.5714;
      }

      console.log("Final coordinates:", { lat, lng });

      // Double-check before using
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        lat = 23.0225;
        lng = 72.5714;
      }

      // Send clock-in request
      const formData = new FormData();
      formData.append("selfie", selfieFile);
      formData.append("lat", lat.toString());
      formData.append("lng", lng.toString());

      const res = await fetch("/api/attendance/clock-in", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (res.ok) {
        showToast("Clock in successful!", 'success', 3000);
        fetchAttendance(authUser.id);
      } else {
        const data = await res.json();
        showToast(data.error || "Clock in failed", 'error', 5000);
      }
    } catch (error) {
      console.error('Clock-in error:', error);
      if (error.name === 'NotAllowedError') {
        showToast('Camera access is required. Please allow camera access to continue.', 'error', 5000);
      } else {
        showToast("Clock in error: " + error.message, 'error', 5000);
      }
    }
  };

  const captureSelfieAndClockOut = async () => {
    try {
      // Check camera permission first with better error handling
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
          break; // Success, exit loop
        } catch (cameraError) {
          console.error(`Camera attempt ${cameraAttempts + 1} failed:`, cameraError);
          cameraAttempts++;

          if (cameraAttempts >= maxAttempts) {
            // Final attempt failed
            if (cameraError.name === 'NotAllowedError' || cameraError.name === 'PermissionDeniedError') {
              showToast('Camera permission is required for attendance.\n\nTo enable camera:\n1. Click the lock/icon in your browser address bar\n2. Allow camera access\n3. Refresh the page\n\nOr use Chrome/Safari for better compatibility.', 'error', 8000);
              return;
            } else if (cameraError.name === 'NotFoundError' || cameraError.name === 'DevicesNotFoundError') {
              showToast('No camera found on this device. Please use a device with camera to clock out.', 'error', 5000);
              return;
            } else if (cameraError.name === 'NotReadableError' || cameraError.name === 'TrackStartError') {
              showToast('Camera is already in use by another application. Please close other apps and try again.', 'error', 5000);
              return;
            } else if (cameraError.name === 'OverconstrainedError' || cameraError.name === 'ConstraintNotSatisfiedError') {
              showToast('Camera does not support the required settings. Please try again.', 'error', 4000);
              return;
            } else {
              // Show location permission request message
              console.log('Requesting location permission for clock-out...');
              showToast('Camera error: ' + (cameraError.message || 'Unknown error') + '. Please try again or use a different browser.', 'error', 5000);
              return;
            }
          } else {
            // Show location permission request message
            console.log('Requesting location permission for clock-out...');
            // First attempt failed, ask user to retry
            const retry = confirm('Camera access needed for attendance. Allow camera access and click OK to retry.');
            if (!retry) {
              showToast('Camera access is required for clock out. Please enable camera permissions and refresh the page.', 'warning', 6000);
              return;
            }
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // If we couldn't get stream after all attempts
      if (!stream) {
        showToast('Unable to access camera. Please check your browser settings and try again.', 'error', 5000);
        return;
      }

      // Create video element for camera stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Create canvas to capture photo
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);

      // Stop camera stream
      stream.getTracks().forEach(track => track.stop());

      // Convert canvas to blob and then to file
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      const selfieFile = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });

      // Get user location with mobile-friendly fallbacks and permission handling
      let lat, lng;
      try {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
          console.log("Geolocation not supported, using defaults");
          lat = 23.0225;
          lng = 72.5714;
        } else {
          // Show location permission request message
          console.log('Requesting location permission for clock-out...');
          const position = await new Promise((resolve, reject) => {
            const options = {
              enableHighAccuracy: false, // Better for mobile
              timeout: 20000, // Longer timeout for mobile
              maximumAge: 60000 // Accept cached location
            };

            navigator.geolocation.getCurrentPosition(
              (pos) => {
                console.log("Location received successfully:", pos.coords);
                resolve(pos.coords);
              },
              (error) => {
                console.log("Geolocation error:", error);
                let message = 'Location access denied. Using default location (Ahmedabad).';

                if (error.code === 1) { // PERMISSION_DENIED
                  message = 'Location permission denied. Using default location (Ahmedabad).\n\nFor accurate attendance tracking:\n� Enable location permissions in your browser settings\n� Click the location icon in your browser address bar\n� Allow location access for this site';
                } else if (error.code === 2) { // POSITION_UNAVAILABLE
                  message = 'Location unavailable. Using default location (Ahmedabad).\n\nPlease check your GPS/location services.';
                } else if (error.code === 3) { // TIMEOUT
                  message = 'Location request timed out. Using default location (Ahmedabad).\n\nPlease try again with better network connectivity.';
                }

                // Show user-friendly message but continue with defaults
                console.log(message);

                // Always resolve with defaults instead of rejecting
                resolve({ lat: 23.0225, lng: 72.5714 });
              },
              options
            );
          });

          // Multiple fallbacks for mobile compatibility
          lat = position?.lat || position?.latitude || 23.0225;
          lng = position?.lng || position?.longitude || 72.5714;

          // Convert to numbers and validate
          lat = Number(lat);
          lng = Number(lng);

          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            console.log("Invalid coordinates, using defaults");
            lat = 23.0225;
            lng = 72.5714;
          }
        }
      } catch (locationError) {
        console.error("Location error:", locationError);
        lat = 23.0225;
        lng = 72.5714;
      }

      console.log("Final coordinates:", { lat, lng });

      // Double-check before using
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        lat = 23.0225;
        lng = 72.5714;
      }

      // Send clock-out request
      const formData = new FormData();
      formData.append("selfie", selfieFile);
      formData.append("lat", lat.toString());
      formData.append("lng", lng.toString());

      const res = await fetch("/api/attendance/clock-out", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (res.ok) {
        showToast("Clock out successful!", 'success', 3000);
        fetchAttendance(authUser.id);
      } else {
        const data = await res.json();
        showToast(data.error || "Clock out failed", 'error', 5000);
      }
    } catch (error) {
      console.error('Clock-out error:', error);
      if (error.name === 'NotAllowedError') {
        showToast('Camera access is required. Please allow camera access to continue.', 'error', 5000);
      } else {
        showToast("Clock out error: " + error.message, 'error', 5000);
      }
    }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="text-lg font-semibold text-gray-900">Attendance</h1>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${clockedIn ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}>
                {clockedIn ? "Active" : "Inactive"}
              </div>
            </div>
            {userDetails && (
              <div className="text-sm">
                <span className="text-gray-500">Welcome, </span>
                <span className="font-medium text-gray-900">
                  {userDetails.name || `User ${userDetails.id}`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:flex lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen">
            <div className="w-64 bg-white shadow-lg lg:overflow-y-auto flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Welcome</h2>
                    <p className="text-sm text-gray-500">
                      {userDetails?.name || (authUser?.role === "User" ? `User ${authUser.id}` : "Admin")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`p-3 rounded-lg ${clockedIn ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Status</span>
                      <div className={`w-2 h-2 rounded-full ${clockedIn ? "bg-green-500" : "bg-gray-400"
                        }`}></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {clockedIn ? "Currently Clocked In" : "Not Clocked In"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sticky Logout Button */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 lg:ml-0">
            <div className="p-4 sm:p-6 lg:p-8">
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
                    disabled={clockedIn}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${clockedIn
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                  >
                    {clockedIn ? "Already Clocked In" : "Clock In"}
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
                  <button
                    onClick={captureSelfieAndClockOut}
                    disabled={!clockedIn}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${!clockedIn
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                  >
                    Clock Out
                  </button>
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
                        {record.IsLate && !record.IsApproved && (
                          <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-sm">
                            ⚠️ {record.ApprovalMessage || "Pending approval"}
                          </div>
                        )}

                        {/* Photos */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Photos</div>
                          <div className="flex space-x-2">
                            {record.SelfieIn && (
                              <img
                                src={record.SelfieIn}
                                alt="Clock In"
                                className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => openImageModal(record.SelfieIn, 'Clock In')}
                              />
                            )}
                            {record.SelfieOut && (
                              <img
                                src={record.SelfieOut}
                                alt="Clock Out"
                                className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => openImageModal(record.SelfieOut, 'Clock Out')}
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
                                      src={record.SelfieIn}
                                      alt="Clock In"
                                      className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => openImageModal(record.SelfieIn, 'Clock In')}
                                    />
                                  )}
                                  {record.SelfieOut && (
                                    <img
                                      src={record.SelfieOut}
                                      alt="Clock Out"
                                      className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => openImageModal(record.SelfieOut, 'Clock Out')}
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
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setSidebarOpen(false)}></div>
            <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className={`p-3 rounded-lg ${clockedIn ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Status</span>
                      <div className={`w-2 h-2 rounded-full ${clockedIn ? "bg-green-500" : "bg-gray-400"
                        }`}></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {clockedIn ? "Currently Clocked In" : "Not Clocked In"}
                    </p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
            <div className="flex-shrink-0 mr-3">
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
              className="ml-4 flex-shrink-0 text-white hover:opacity-80 transition-opacity"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 10.586l-8.293 8.293a1 1 0 01-1.414 1.414L10 12.414l8.293-8.293a1 1 0 111.414-1.414L10 10.586l-8.293 8.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </RouteGuard>
  );
};
