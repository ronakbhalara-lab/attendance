"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export default function LeaveNotificationModal({ 
  pendingLeaves, 
  isVisible, 
  onClose, 
  onApprove, 
  onReject, 
  onGoToLeaveManagement 
}) {
  const [processingId, setProcessingId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPersistent, setShowPersistent] = useState(false);
  const audioRef = useRef(null);

  // Persistent notification - no auto-hide timer
  useEffect(() => {
    if (isVisible && pendingLeaves.length > 0) {
      playNotificationSound();
    }
    
    return () => {
      stopNotificationSound();
    };
  }, [isVisible, pendingLeaves.length]);

  const playNotificationSound = () => {
    try {
      // Clean up any existing audio context first
      if (audioRef.current?.audioContext && audioRef.current.audioContext.state !== 'closed') {
        audioRef.current.audioContext.close();
      }
      
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // 800 Hz tone
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      setIsPlaying(true);
      
      // Repeat the sound every second for 5 seconds
      const soundInterval = setInterval(() => {
        // Check if context is still valid before creating new oscillator
        if (audioContext.state === 'closed') {
          clearInterval(soundInterval);
          return;
        }
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.value = 800;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.5);
      }, 1000);
      
      // Store interval ID to clear it later
      audioRef.current = { audioContext, soundInterval };
      
      // Stop after 5 seconds
      setTimeout(() => {
        if (audioRef.current?.soundInterval) {
          clearInterval(audioRef.current.soundInterval);
        }
        setIsPlaying(false);
      }, 5000);
      
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  const stopNotificationSound = () => {
    try {
      if (audioRef.current?.soundInterval) {
        clearInterval(audioRef.current.soundInterval);
      }
      if (audioRef.current?.audioContext && audioRef.current.audioContext.state !== 'closed') {
        audioRef.current.audioContext.close();
      }
      setIsPlaying(false);
    } catch (error) {
      console.error("Error stopping notification sound:", error);
    }
  };

  const handleApprove = async (leaveId) => {
    setProcessingId(leaveId);
    stopNotificationSound();
    try {
      await onApprove(leaveId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (leaveId) => {
    setProcessingId(leaveId);
    stopNotificationSound();
    try {
      await onReject(leaveId);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getLeaveDurationText = (duration) => {
    switch (duration) {
      case 'firstHalf':
        return 'First Half';
      case 'secondHalf':
        return 'Second Half';
      case 'full':
      default:
        return 'Full Day';
    }
  };

  if (!isVisible || pendingLeaves.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-pulse">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 border-4 border-orange-400">
        {/* Header */}
        <div className="bg-linear-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-2xl relative overflow-hidden">
          <div className="flex items-center space-x-3">
            <div className={`bg-white bg-opacity-20 p-4 rounded-full ${isPlaying ? 'animate-bounce' : ''}`}>
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">🚨 New Leave Request!</h2>
              <p className="text-orange-100 text-sm">
                {pendingLeaves.length} pending request{pendingLeaves.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {isPlaying && (
            <div className="flex items-center space-x-1 mt-2">
              <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-ping animation-delay-200"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-ping animation-delay-400"></div>
              <span className="text-xs ml-2">Playing notification...</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            {pendingLeaves.slice(0, 3).map((leave) => (
              <div key={leave.id} className="border-2 border-orange-200 rounded-xl p-4 hover:shadow-lg transition-all hover:border-orange-400 bg-orange-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-bold text-gray-900 text-lg">{leave.userName}</span>
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-semibold">
                        {leave.leaveType}
                      </span>
                      <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full font-semibold">
                        {getLeaveDurationText(leave.leaveDuration)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-700 space-y-1">
                      <div className="flex items-center space-x-2 font-medium">
                        <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span>
                          {formatDate(leave.startDate)} 
                          {leave.startDate !== leave.endDate && ` - ${formatDate(leave.endDate)}`}
                        </span>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <svg className="w-4 h-4 mt-0.5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="line-clamp-2 italic">{leave.reason}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {pendingLeaves.length > 3 && (
              <div className="text-center text-sm text-gray-600 bg-orange-100 rounded-lg p-3">
                +{pendingLeaves.length - 3} more requests...
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center border-t-2 border-orange-200">
          <button
            onClick={onGoToLeaveManagement}
            className="text-orange-600 hover:text-orange-800 font-bold text-sm flex items-center space-x-1 bg-orange-100 px-3 py-2 rounded-lg hover:bg-orange-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
            </svg>
            <span>View All</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
