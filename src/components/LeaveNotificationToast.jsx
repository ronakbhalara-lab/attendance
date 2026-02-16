"use client";
import { useState, useEffect, useRef } from "react";

export default function LeaveNotificationToast({ 
  pendingLeaves, 
  isVisible, 
  onClose, 
  onApprove, 
  onReject, 
  onGoToLeaveManagement 
}) {
  const [processingId, setProcessingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const audioRef = useRef(null);

  // 10-second timer with sound and countdown
  useEffect(() => {
    if (isVisible && pendingLeaves.length > 0) {
      setTimeLeft(10);
      playNotificationSound();
      
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            stopNotificationSound();
            setTimeout(() => onClose(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        stopNotificationSound();
      };
    }
  }, [isVisible, pendingLeaves.length, onClose]);

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
      
      // Increased volume - set gain to 0.6 (was 0.3)
      gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      setIsPlaying(true);
      
      // Store audio context reference
      audioRef.current = { audioContext };
      
      // Repeat sound every second for 10 seconds with increased volume
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
        
        // Increased volume for each beep
        gain.gain.setValueAtTime(0.6, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.5);
      }, 1000);
      
      // Store interval ID to clear it later
      audioRef.current = { audioContext, soundInterval };
      
      // Add notification music - play a pleasant melody
      playNotificationMusic(audioContext);
      
      // Stop after 10 seconds
      setTimeout(() => {
        if (audioRef.current?.soundInterval) {
          clearInterval(audioRef.current.soundInterval);
        }
        setIsPlaying(false);
      }, 10000);
      
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  const playNotificationMusic = (audioContext) => {
    try {
      // Create a pleasant notification melody
      const notes = [523.25, 587.33, 659.25, 698.46, 783.99]; // C5, D5, E5, F5, G5 frequencies
      const noteDuration = 0.3; // 300ms per note
      const tempo = 200; // 200ms between notes
      
      notes.forEach((frequency, index) => {
        setTimeout(() => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          
          osc.connect(gain);
          gain.connect(audioContext.destination);
          
          osc.frequency.value = frequency;
          osc.type = 'sine';
          
          // Music volume slightly lower than beeps
          gain.gain.setValueAtTime(0.4, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + noteDuration);
          
          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + noteDuration);
        }, index * tempo);
      });
      
    } catch (error) {
      console.error("Error playing notification music:", error);
    }
  };

  const stopNotificationSound = () => {
    try {
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
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
      <div className="bg-white rounded-lg shadow-2xl border-l-4 border-orange-500 max-w-sm w-full min-w-87.5 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-orange-500 to-red-500 text-white p-4 relative">
          <div className="absolute top-2 right-2 bg-yellow-400 text-orange-900 px-2 py-1 rounded-full font-bold text-xs">
            {timeLeft}s
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`bg-white bg-opacity-20 p-2 rounded-full ${isPlaying ? 'animate-pulse' : ''}`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm">🚨 New Leave Request!</h3>
                <p className="text-orange-100 text-xs">
                  {pendingLeaves.length} pending request{pendingLeaves.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded-full transition-colors"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {isPlaying && (
            <div className="flex items-center space-x-1 mt-2">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
              <span className="text-xs">🔊</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-h-75 overflow-y-auto">
          <div className="p-3 space-y-2">
            {pendingLeaves.slice(0, 3).map((leave) => (
              <div key={leave.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm truncate">{leave.userName}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {leave.leaveType}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        {getLeaveDurationText(leave.leaveDuration)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">
                          {formatDate(leave.startDate)} 
                          {leave.startDate !== leave.endDate && ` - ${formatDate(leave.endDate)}`}
                        </span>
                      </div>
                      
                      <div className="flex items-start space-x-1">
                        <svg className="w-3 h-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="line-clamp-2 italic">{leave.reason}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1 ml-2">
                    <button
                      onClick={() => handleApprove(leave.id)}
                      disabled={processingId === leave.id}
                      className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {processingId === leave.id ? (
                        <>
                          <svg className="animate-spin h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2h2a1 1 0 011 1v5a1 1 0 11-2 0V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          <span>...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>✓</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleReject(leave.id)}
                      disabled={processingId === leave.id}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {processingId === leave.id ? (
                        <>
                          <svg className="animate-spin h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2h2a1 1 0 011 1v5a1 1 0 11-2 0V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          <span>...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span>✗</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {pendingLeaves.length > 3 && (
              <div className="text-center text-xs text-gray-600 bg-gray-100 rounded-lg p-2">
                +{pendingLeaves.length - 3} more requests...
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onGoToLeaveManagement}
            className="text-orange-600 hover:text-orange-800 font-semibold text-xs flex items-center space-x-1 hover:bg-orange-100 px-2 py-1 rounded transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
            </svg>
            <span>View All</span>
          </button>
          
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 font-semibold text-xs hover:bg-gray-100 px-2 py-1 rounded transition-colors"
          >
            Dismiss ({timeLeft}s)
          </button>
        </div>
      </div>
    </div>
  );
}
