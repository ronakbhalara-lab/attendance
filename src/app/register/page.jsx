"use client";
import { useState } from "react";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!fullName || !username || !password) {
      alert("All fields are required");
      return;
    }

    setLoading(true);
    
    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("username", username);
    formData.append("password", password);
    
    if (profilePhoto) {
      formData.append("profilePhoto", profilePhoto);
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: formData, // Don't set Content-Type for FormData
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Registration failed");
        return;
      }

      alert("Registration successful! Please login.");
      window.location.href = "/";
    } catch (error) {
      alert("Registration failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-80">
        <h2 className="text-xl mb-4 font-bold">Register</h2>

        <input
          className="border w-full p-2 mb-2"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="border w-full p-2 mb-2"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          className="border w-full p-2 mb-2"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="file"
          className="border w-full p-2 mb-4"
          accept="image/*"
          onChange={(e) => setProfilePhoto(e.target.files[0])}
        />

        {profilePhoto && (
          <div className="mb-4 text-sm text-gray-600">
            Selected: {profilePhoto.name}
          </div>
        )}

        <button
          className="bg-blue-600 text-white w-full p-2 disabled:bg-gray-400"
          onClick={register}
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="mt-4 text-center">
          <a href="/" className="text-blue-600 hover:underline">
            Already have an account? Login
          </a>
        </div>
      </div>
    </div>
  );
}
