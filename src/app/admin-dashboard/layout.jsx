"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Layout({ children }) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) router.push("/admin");
  }, []);

  return children;
}
