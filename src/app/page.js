"use client";
import { useState } from "react";

export default function page() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");

  const login = async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"   // ✅ MUST
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json(); // now valid JSON

    if (!res.ok) {
      alert(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.userId);
    localStorage.setItem("role", data.role);

    location.href = data.role === "Admin" ? "/admin" : "/dashboard";
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="bg-white p-6 rounded shadow w-80">
        <h2 className="text-xl mb-4 font-bold">Login</h2>

        <input
          className="border w-full p-2 mb-2"
          placeholder="Username"
          onChange={e => setU(e.target.value)}
        />

        <input
          type="password"
          className="border w-full p-2 mb-4"
          placeholder="Password"
          onChange={e => setP(e.target.value)}
        />

        <button
          className="bg-blue-600 text-white w-full p-2"
          onClick={login}
        >
          Login
        </button>

        <div className="mt-4 text-center">
          <a href="/register" className="text-blue-600 hover:underline">
            Don't have an account? Register
          </a>
        </div>

        <div className="mt-2 text-center">
          <a href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  );
}
