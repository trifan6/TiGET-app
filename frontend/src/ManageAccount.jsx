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
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Top Section: Navigation Tabs */}
      <div style={{ padding: "15px" }}>
        <div
          style={{
            display: "flex",
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: "30px",
            padding: "4px",
          }}
        >
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              backgroundColor:
                activeTab === "profile" ? "rgba(255,255,255,0.1)" : "transparent",
              color: activeTab === "profile" ? "#fff" : "#888",
              fontWeight: "600",
              fontSize: "0.95rem",
              letterSpacing: "1px",
            }}
          >
            PROFILE
          </button>
          <button
            onClick={() => setActiveTab("security")}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              backgroundColor:
                activeTab === "security" ? "rgba(255,255,255,0.1)" : "transparent",
              color: activeTab === "security" ? "#fff" : "#888",
              fontWeight: "600",
              fontSize: "0.95rem",
              letterSpacing: "1px",
            }}
          >
            SECURITY
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          padding: "15px 20px 30px 20px",
          gap: "25px",
        }}
      >
        {activeTab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
            <div style={{ backgroundColor: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "20px" }}>
              <p style={{ margin: 0, color: "#888", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "1px" }}>Email</p>
              <p style={{ margin: "8px 0 0 0", color: "#fff", fontSize: "1.2rem", fontWeight: "500" }}>{userEmail}</p>
            </div>
            <div style={{ backgroundColor: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "20px" }}>
              <p style={{ margin: 0, color: "#888", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "1px" }}>Role / Clearance</p>
              <p style={{ margin: "8px 0 0 0", color: "#E7462F", fontSize: "1.2rem", fontWeight: "600" }}>{userRole}</p>
            </div>

            {/* Flexible spacer to push the Log Out button to the bottom */}
            <div style={{ flex: 1 }} />

            <button
              onClick={onLogout}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #E7462F",
                color: "#E7462F",
                padding: "16px",
                borderRadius: "20px",
                fontWeight: "600",
                fontSize: "1.05rem",
                cursor: "pointer",
                transition: "0.2s",
                letterSpacing: "1px"
              }}
              onMouseOver={(e) => { e.target.style.backgroundColor = "#E7462F"; e.target.style.color = "#fff"; }}
              onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#E7462F"; }}
            >
              LOG OUT
            </button>
          </div>
        )}

        {activeTab === "security" && (
          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
            <div style={{ backgroundColor: "rgba(231, 70, 47, 0.1)", padding: "16px", borderRadius: "20px", border: "1px solid rgba(231, 70, 47, 0.3)" }}>
              <p style={{ margin: 0, color: "#E7462F", fontSize: "0.95rem", textAlign: "center", fontWeight: "500" }}>
                🔒 3-Way Authentication Required
              </p>
            </div>

            <input
              type="password"
              placeholder="Current Password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={{ padding: "16px", borderRadius: "20px", border: "none", backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", outline: "none", fontSize: "1.05rem" }}
            />
            <input
              type="password"
              placeholder="Recovery PIN (Hint: tiget2026)"
              required
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              style={{ padding: "16px", borderRadius: "20px", border: "1px solid rgba(231, 70, 47, 0.5)", backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", outline: "none", fontSize: "1.05rem" }}
            />
            <input
              type="password"
              placeholder="New Password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ padding: "16px", borderRadius: "20px", border: "none", backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", outline: "none", fontSize: "1.05rem" }}
            />

            {/* Flexible spacer to push the Update button to the bottom */}
            <div style={{ flex: 1 }} />

            <button
              type="submit"
              style={{ backgroundColor: "#E7462F", border: "none", color: "#fff", padding: "16px", borderRadius: "20px", fontWeight: "600", fontSize: "1.05rem", cursor: "pointer", letterSpacing: "1px" }}
            >
              UPDATE PASSWORD
            </button>
          </form>
        )}

        {toast && (
          <div style={{
            padding: "15px", borderRadius: "16px", textAlign: "center", fontSize: "1rem",
            backgroundColor: toast.type === "error" ? "rgba(231, 70, 47, 0.2)" : "rgba(76, 175, 80, 0.2)",
            color: toast.type === "error" ? "#ff6b6b" : "#4CAF50",
            border: `1px solid ${toast.type === "error" ? "#ff6b6b" : "#4CAF50"}`
          }}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}