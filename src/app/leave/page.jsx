"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { RouteGuard } from "@/components/RouteGuard";
import DashboardLayout from "@/components/DashboardLayout";

export default function Leave() {
  const { user: authUser } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    leaveDuration: 'full' // full, firstHalf, secondHalf
  });

  useEffect(() => {
    if (authUser) {
      fetchLeaveRequests();
    } else {
      setLoading(false);
    }
  }, [authUser]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leave/requests", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data || []);
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Failed to fetch leave requests", 'error', 3000);
        setLeaveRequests([]);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      showToast("Network error. Please check your connection.", 'error', 3000);
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.leaveType) {
      showToast("Please select leave type", 'error', 3000);
      return;
    }
    
    if (!formData.leaveDuration) {
      showToast("Please select leave duration", 'error', 3000);
      return;
    }
    
    if (!formData.startDate) {
      showToast("Please select start date", 'error', 3000);
      return;
    }
    
    if (!formData.endDate) {
      showToast("Please select end date", 'error', 3000);
      return;
    }
    
    if (!formData.reason || formData.reason.trim() === '') {
      showToast("Please provide reason for leave", 'error', 3000);
      return;
    }

    // Validate date logic
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      showToast("End date must be after start date", 'error', 3000);
      return;
    }

    try {
      const res = await fetch("/api/leave/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newRequest = await res.json();
        showToast("Leave request submitted successfully", 'success', 3000);
        setFormData({ leaveType: '', startDate: '', endDate: '', reason: '', leaveDuration: 'full' });
        setShowForm(false);
        // Add the new request to the existing list for immediate UI update
        setLeaveRequests(prev => [newRequest, ...prev]);
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Failed to submit leave request", 'error', 5000);
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      showToast("Network error. Please try again.", 'error', 5000);
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
      <DashboardLayout>
        <div className="">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-xs sm:text-base text-gray-600 mt-1">Manage your leave requests</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              Add Leave
            </button>
          </div>
        </div>

        {/* Leave Request Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-[#0000006b] bg-opacity-50 z-50 flex items-end justify-center sm:items-center sm:justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-xl w-full sm:max-w-2xl sm:max-h-[90vh] max-h-[90vh] overflow-y-auto transform transition-transform duration-300 ease-out">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4 sm:border-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-xl font-semibold text-gray-900">Submit Leave Request</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type
                  </label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select leave type</option>
                    <option value="sick">Sick Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Duration
                  </label>
                  <select
                    value={formData.leaveDuration}
                    onChange={(e) => setFormData({...formData, leaveDuration: e.target.value})}
                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="full">Full Day Leave</option>
                    <option value="firstHalf">First Half Leave</option>
                    <option value="secondHalf">Second Half Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      min={formData.startDate}
                      className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Provide a reason for your leave request..."
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pb-4 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-full sm:w-auto order-2 sm:order-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto order-1 sm:order-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm sm:text-base"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Leave Requests List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Leave Requests</h2>
            <p className="text-sm text-gray-600 mt-1">History of your leave requests</p>
          </div>

          {leaveRequests.length === 0 ? (
            <div className="p-6 sm:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No leave requests</h3>
              <p className="text-sm text-gray-600 px-4">You haven't submitted any leave requests yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-gray-200">
                {leaveRequests.map((request, index) => (
                  <div key={request.id || index} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="capitalize text-sm font-medium text-gray-900">{request.leaveType}</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                            request.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.status || 'pending'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Duration: {request.leaveDuration === 'full' ? 'Full Day' : request.leaveDuration === 'firstHalf' ? 'First Half' : 'Second Half'}</div>
                          <div>Period: {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}</div>
                          <div>Applied: {new Date(request.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-900">
                      <div className="font-medium text-xs text-gray-700 mb-1">Reason:</div>
                      <div className="line-clamp-2">{request.reason}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-150">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave Type
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave Period
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied On
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveRequests.map((request, index) => (
                      <tr key={request.id || index} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className="capitalize text-sm text-gray-900">{request.leaveType}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {request.leaveDuration === 'full' ? 'Full Day' : 
                             request.leaveDuration === 'firstHalf' ? 'First Half' : 
                             'Second Half'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-30 sm:max-w-none">
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900">
                          <div className="max-w-30 sm:max-w-xs truncate" title={request.reason}>
                            {request.reason}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            request.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      </DashboardLayout>
    </RouteGuard>
  );
}