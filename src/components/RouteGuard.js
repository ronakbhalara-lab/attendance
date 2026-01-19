"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RouteGuard({ children }) {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      // Redirect to login page if not authenticated
      router.push("/");
      return;
    }
  }, [router]);

  // Optional: Check token validity
  useEffect(() => {
    const checkTokenValidity = () => {
      const token = localStorage.getItem("token");
      
      if (token) {
        try {
          // Basic token validation (you can enhance this)
          const tokenParts = token.split('.');
          if (tokenParts.length !== 3) {
            // Invalid token format
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            localStorage.removeItem("role");
            router.push("/");
            return;
          }

          // Check if token is expired (basic check)
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            const currentTime = Date.now() / 1000;
            
            if (payload.exp && payload.exp < currentTime) {
              // Token expired
              localStorage.removeItem("token");
              localStorage.removeItem("userId");
              localStorage.removeItem("role");
              router.push("/");
              return;
            }
          } catch (error) {
            // Invalid token
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            localStorage.removeItem("role");
            router.push("/");
            return;
          }
        } catch (error) {
          // Token parsing failed
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          localStorage.removeItem("role");
          router.push("/");
          return;
        }
      }
    };

    checkTokenValidity();
    
    // Set up periodic token check (every 5 minutes)
    const interval = setInterval(checkTokenValidity, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [router]);

  return <>{children}</>;
}
