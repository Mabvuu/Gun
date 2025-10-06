import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supebaseClient";

export default function Logout({ className, children }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Log out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Redirect to login
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err.message);
      alert("Failed to logout. See console for details.");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={className || "px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"}
    >
      {children || "Logout"}
    </button>
  );
}
