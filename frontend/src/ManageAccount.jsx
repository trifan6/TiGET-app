import React, { useState } from "react";
import Cookies from "js-cookie";

export default function ManageAccount({ onClose, onLogout }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [toast, setToast] = useState(null);

  const userEmail = Cookies.get("user_email") || "Unknown User";
  const userRole = Cookies.get("user_role") || "CONSUMER";
  const userId = Cookies.get("user_id");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    // 3-Way Auth Validation (Simulated Security Question)
    if (securityAnswer.trim().toLowerCase() !== "tiget2026") {
      showToast("3-Way Auth Failed: Incorrect Security PIN.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters.", "error");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation ChangePassword($id: ID!, $oldPassword: String!, $newPassword: String!) {
              changePassword(id: $id, oldPassword: $oldPassword, newPassword: $newPassword)
            }
          `,
          variables: { id: userId, oldPassword, newPassword },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        showToast(`Error: ${result.errors[0].message}`, "error");
      } else {
        showToast("Password updated securely!", "success");
        setOldPassword("");
        setNewPassword("");
        setSecurityAnswer("");
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to connect to the server.", "error");
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "60px",
        right: "20px",
        width: "380px",
        backgroundColor: "rgba(21, 21, 27, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, color: "#EFEFEF", fontSize: "1.2rem", fontWeight: "600", letterSpacing: "1px" }}>
          ACCOUNT
        </h3>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "1.2rem" }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "20px", padding: "4px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("profile")}
          style={{
            flex: 1, padding: "8px 0", border: "none", borderRadius: "16px", cursor: "pointer",
            backgroundColor: activeTab === "profile" ? "rgba(255,255,255,0.1)" : "transparent",
            color: activeTab === "profile" ? "#fff" : "#888", fontWeight: "600", fontSize: "0.9rem"
          }}
        >
          PROFILE
        </button>
        <button
          onClick={() => setActiveTab("security")}
          style={{
            flex: 1, padding: "8px 0", border: "none", borderRadius: "16px", cursor: "pointer",
            backgroundColor: activeTab === "security" ? "rgba(255,255,255,0.1)" : "transparent",
            color: activeTab === "security" ? "#fff" : "#888", fontWeight: "600", fontSize: "0.9rem"
          }}
        >
          SECURITY
        </button>
      </div>

      {activeTab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ backgroundColor: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "16px" }}>
            <p style={{ margin: 0, color: "#888", fontSize: "0.85rem", textTransform: "uppercase" }}>Email</p>
            <p style={{ margin: "5px 0 0 0", color: "#fff", fontSize: "1.1rem", fontWeight: "500" }}>{userEmail}</p>
          </div>
          <div style={{ backgroundColor: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "16px" }}>
            <p style={{ margin: 0, color: "#888", fontSize: "0.85rem", textTransform: "uppercase" }}>Role / Clearance</p>
            <p style={{ margin: "5px 0 0 0", color: "#E7462F", fontSize: "1.1rem", fontWeight: "600" }}>{userRole}</p>
          </div>

          <button
            onClick={onLogout}
            style={{
              marginTop: "20px", backgroundColor: "transparent", border: "1px solid #E7462F",
              color: "#E7462F", padding: "12px", borderRadius: "16px", fontWeight: "600", cursor: "pointer", transition: "0.2s"
            }}
            onMouseOver={(e) => { e.target.style.backgroundColor = "#E7462F"; e.target.style.color = "#fff"; }}
            onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#E7462F"; }}
          >
            LOG OUT
          </button>
        </div>
      )}

      {activeTab === "security" && (
        <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ backgroundColor: "rgba(231, 70, 47, 0.1)", padding: "10px", borderRadius: "12px", border: "1px solid rgba(231, 70, 47, 0.3)" }}>
            <p style={{ margin: 0, color: "#E7462F", fontSize: "0.85rem", textAlign: "center" }}>
              🔒 3-Way Authentication Required
            </p>
          </div>

          <input
            type="password"
            placeholder="Current Password"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            style={{ padding: "12px", borderRadius: "16px", border: "none", backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", outline: "none" }}
          />
          <input
            type="password"
            placeholder="Recovery PIN (Hint: tiget2026)"
            required
            value={securityAnswer}
            onChange={(e) => setSecurityAnswer(e.target.value)}
            style={{ padding: "12px", borderRadius: "16px", border: "1px solid rgba(231, 70, 47, 0.5)", backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", outline: "none" }}
          />
          <input
            type="password"
            placeholder="New Password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: "12px", borderRadius: "16px", border: "none", backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", outline: "none" }}
          />

          <button
            type="submit"
            style={{ marginTop: "10px", backgroundColor: "#E7462F", border: "none", color: "#fff", padding: "12px", borderRadius: "16px", fontWeight: "600", cursor: "pointer" }}
          >
            UPDATE PASSWORD
          </button>
        </form>
      )}

      {toast && (
        <div style={{
          marginTop: "15px", padding: "10px", borderRadius: "12px", textAlign: "center", fontSize: "0.9rem",
          backgroundColor: toast.type === "error" ? "rgba(231, 70, 47, 0.2)" : "rgba(76, 175, 80, 0.2)",
          color: toast.type === "error" ? "#ff6b6b" : "#4CAF50",
          border: `1px solid ${toast.type === "error" ? "#ff6b6b" : "#4CAF50"}`
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}