"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const t = params.get("token");
    if (!t) setError("Invalid link");
    else setToken(t);
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Password reset successfully");
      setTimeout(() => router.push("/"), 2000);
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500">
      <div className="bg-white rounded-xl shadow-xl w-[420px] p-8">
        <h2 className="text-2xl font-bold text-center text-purple-700 mb-4">
          Reset Password
        </h2>

        {error && <p className="text-red-600 mb-3">{error}</p>}
        {message && <p className="text-green-600 mb-3">{message}</p>}

        <form onSubmit={submit}>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded mb-3"
            placeholder="New Password"
            onChange={e => setNewPassword(e.target.value)}
          />

          <input
            type="password"
            className="w-full border px-3 py-2 rounded mb-4"
            placeholder="Confirm Password"
            onChange={e => setConfirmPassword(e.target.value)}
          />

          <button className="w-full bg-yellow-400 text-white py-2 rounded font-semibold">
            Reset Password
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          <a href="/" className="text-purple-600">Back to Login</a>
        </p>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="text-white text-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
