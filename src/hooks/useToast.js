"use client";
import { useState, useEffect } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info", duration = 3000) => {
    const id = Date.now().toString();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return { toasts, showToast, removeToast };
}

// Toast component
export function Toast({ message, type = "info", duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-500 text-white border-green-600";
      case "error":
        return "bg-red-500 text-white border-red-600";
      case "warning":
        return "bg-yellow-500 text-black border-yellow-600";
      case "info":
      default:
        return "bg-blue-500 text-white border-blue-600";
    }
  };

  const getToastIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414 1.414l-8.485 8.486a1 1 0 01-1.414 0L10 11.414l8.485-8.486a1 1 0 010-1.414 1.414l-8.485 8.486a1 1 0 01-1.414 0L10 11.414l8.485-8.486a1 1 0 010-1.414 1.414z" clipRule="evenodd" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 10.586l-8.293 8.293a1 1 0 111.414 1.414L10 12.414l8.293-8.293a1 1 0 111.414-1.414L10 10.586l-8.293 8.293z" clipRule="evenodd" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 1.5-1.36 1.5-2.354 0-3.972-3-3.972-1.5 0-2.354-1.5-3.972-3.972-4.354 0-7.657 2.929-4.354 3.972-4.354 3.972 0 3.972 3 4.354 0 7.657-2.929 4.354-3.972 0zm0-2.618 1.5-1.36 1.5-1.36 0-2.354-1.5-3.972-3-3.972-4.354 0-7.657 2.929-4.354 3.972-4.354 3.972 0 3.972 3 4.354 0 7.657-2.929 4.354-3.972 0z" clipRule="evenodd" />
          </svg>
        );
      case "info":
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm1-1V4a1 1 0 00-2h-1a1 1 0 00-2h12a1 1 0 00-2h-1a1 1 0 00-2zM9 9a1 1 0 000 2v3a1 1 0 002h2a1 1 0 002-2V9a1 1 0 00-2-2H9a1 1 0 00-2-2z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in">
      <div className={`flex items-center p-4 rounded-lg shadow-lg ${getToastStyles()} border`}>
        <div className="flex-shrink-0 mr-3">
          {getToastIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{message}</p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 flex-shrink-0 text-white hover:opacity-80 transition-opacity"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 10.586l-8.293 8.293a1 1 0 01-1.414 1.414L10 12.414l8.293-8.293a1 1 0 111.414-1.414L10 10.586l-8.293 8.293z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
