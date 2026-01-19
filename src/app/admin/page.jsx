"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ✅ Already logged in hoy to dashboard redirect
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      router.replace("/admin-dashboard");
    }
  }, [router]);

  const login = async () => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      // ✅ SAVE LOGIN DATA
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminEmail", email);
      localStorage.setItem("adminPassword", password); // ⚠️ only for demo

      router.push("/admin-dashboard");
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="flex h-screen justify-center items-center bg-gray-100">
      <div className="border p-6 w-80 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4 text-center">Admin Login</h2>

        <input
          className="border w-full p-2 mb-2"
          placeholder="User name"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="border w-full p-2 mb-4"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="bg-blue-600 text-white w-full p-2 rounded"
        >
          Login
        </button>
      </div>
    </div>
  );
}
