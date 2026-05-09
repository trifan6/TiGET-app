import { useState } from "react";
import "./App.css";
import AdminDashboard from "./AdminDashboard";
import Cookies from "js-cookie";
import UserFeed from "./UserFeed";

function App() {
  const [currentScreen, setCurrentScreen] = useState(() => {
    const isLoggedIn = Cookies.get("is_logged_in");
    const role = Cookies.get("user_role");

    if (isLoggedIn === "true") {
      if (role === "MASTER_ADMIN" || role === "ORGANISER") return "admin";
      return "user-feed";
    }
    return "landing";
  });
  const [authView, setAuthView] = useState("menu");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const resetAuth = (targetScreen = "landing") => {
    setEmail("");
    setPassword("");
    setAuthView("menu");

    Cookies.remove("is_logged_in");
    Cookies.remove("user_email");
    Cookies.remove("user_role");
    Cookies.remove("user_id");

    setCurrentScreen(targetScreen);
  };

  if (currentScreen === "landing") {
    return (
      <div className="screen landing-screen">
        <div className="landing-left-container">
          <div className="landing-circle-bg">
            <img
              src="/logo_tagline.png"
              alt="TiGET Logo"
              className="logo-massive-img"
            />
          </div>
        </div>

        <div className="landing-right-container">
          <button
            className="btn-get-started"
            onClick={() => setCurrentScreen("auth")}
          >
            GET STARTED
          </button>
          <p className="description-text">
            Welcome to the smarter way to experience live events. We learn what
            you love to watch, listen to, and attend, instantly connecting you
            with the events that match your exact vibe. Thanks to our real-time
            pricing engine, you can score exclusive last-minute deals on unsold
            tickets, or secure your spot at the year's biggest sold-out shows.
            Never miss out, and never overpay.
          </p>
        </div>
      </div>
    );
  }

  if (currentScreen === "auth") {
    return (
      <div className="screen auth-screen">
        <div className="auth-bg-curve"></div>
        <div className="auth-content">
          <div className="auth-left-box">
            <img src="/logo.png" alt="TiGET Logo" className="logo-img-auth" />
          </div>

          <div className="auth-right-box">
            {authView === "menu" && (
              <>
                <div className="auth-buttons-stack">
                  <button
                    className="btn-auth"
                    onClick={() => setAuthView("login")}
                  >
                    LOG<span className="keep-i">i</span>N
                  </button>
                  <button
                    className="btn-auth"
                    onClick={() => setAuthView("register")}
                  >
                    REG<span className="keep-i">i</span>STER
                  </button>
                </div>

                <button
                  className="btn-organiser-corner"
                  onClick={() => setAuthView("organiser")}
                >
                  BECOME AN ORGAN<span className="keep-i">i</span>SER
                </button>
              </>
            )}

            {authView === "login" && (
              <div className="auth-form-stack">
                <h2 className="auth-title">
                  LOG<span className="keep-i">i</span>N
                </h2>
                <input
                  type="text"
                  placeholder="username"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="forgot-password">forgot password?</p>

                <button
                  className="btn-auth submit-btn"
                  onClick={async () => {
                    if (!email || !password) {
                      alert("Error: Please enter your credentials.");
                      return;
                    }
                    if (!emailRegex.test(email)) {
                      alert("Error: Please enter a valid email address.");
                      return;
                    }

                    try {
                      const response = await fetch(
                        "http://localhost:3000/graphql",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            query: `
                          mutation Login($email: String!, $password: String!) {
                            login(email: $email, password: $password) {
                              id
                              email
                              role {
                                name
                              }
                            }
                          }
                        `,
                            variables: { email, password },
                          }),
                        },
                      );

                      const result = await response.json();

                      if (result.errors) {
                        alert(result.errors[0].message);
                        return;
                      }

                      const user = result.data.login;
                      const userRole = user.role.name;

                      Cookies.set("user_email", user.email, { expires: 7 });
                      Cookies.set("user_role", userRole, { expires: 7 });
                      Cookies.set("user_id", user.id, { expires: 7 });
                      Cookies.set("is_logged_in", "true");

                      if (
                        userRole === "MASTER_ADMIN" ||
                        userRole === "ORGANISER"
                      ) {
                        setCurrentScreen("admin");
                      } else {
                        setCurrentScreen("user-feed");
                      }
                    } catch (error) {
                      console.error("Login error:", error);
                      alert("Failed to connect to the server.");
                    }
                  }}
                >
                  continue
                </button>

                <button
                  className="btn-auth"
                  onClick={() => setAuthView("menu")}
                >
                  ← back
                </button>
              </div>
            )}

            {authView === "register" && (
              <div className="auth-form-stack">
                <h2 className="auth-title">
                  REG<span className="keep-i">i</span>STER
                </h2>
                <input
                  type="email"
                  placeholder="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="username"
                  className="auth-input"
                />
                <input
                  type="text"
                  placeholder="first name"
                  className="auth-input"
                />
                <input
                  type="text"
                  placeholder="last name"
                  className="auth-input"
                />
                <input
                  type="password"
                  placeholder="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  className="btn-auth submit-btn"
                  onClick={() => {
                    if (!email || !password) {
                      alert("Error: Please fill out all required fields.");
                      return;
                    }
                    if (!emailRegex.test(email)) {
                      alert("Error: Please enter a valid email address.");
                      return;
                    }
                    if (password.length < 6) {
                      alert("Error: Password must be at least 6 characters.");
                      return;
                    }

                    Cookies.set("user_email", email, { expires: 7 });
                    Cookies.set("is_logged_in", "true");
                    alert("Registration successful! Logging you in...");

                    if (email === "admin@tiget.com") {
                      setCurrentScreen("admin");
                    } else {
                      setCurrentScreen("user-feed");
                    }
                  }}
                >
                  create
                </button>

                <button
                  className="btn-auth"
                  onClick={() => setAuthView("menu")}
                >
                  ← back
                </button>
              </div>
            )}

            {authView === "organiser" && (
              <div className="auth-form-stack">
                <h2 className="auth-title">
                  ORGAN<span className="keep-i">i</span>SER
                </h2>
                <input
                  type="email"
                  placeholder="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="organisation"
                  className="auth-input"
                />
                <input
                  type="text"
                  placeholder="tax ID"
                  className="auth-input"
                />
                <input
                  type="password"
                  placeholder="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  className="btn-auth submit-btn"
                  onClick={() => {
                    if (!email || !password) {
                      alert("Error: Please fill out all required fields.");
                      return;
                    }
                    if (!emailRegex.test(email)) {
                      alert("Error: Please enter a valid email address.");
                      return;
                    }
                    if (password.length < 6) {
                      alert("Error: Password must be at least 6 characters.");
                      return;
                    }

                    Cookies.set("user_email", email, { expires: 7 });
                    Cookies.set("is_logged_in", "true");
                    alert(
                      "Organiser Registration successful! Logging you in...",
                    );

                    setCurrentScreen("admin");
                  }}
                >
                  create
                </button>

                <button
                  className="btn-auth"
                  onClick={() => setAuthView("menu")}
                >
                  ← back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === "user-feed") {
    return <UserFeed onLogout={() => resetAuth("landing")} />;
  }

  return <AdminDashboard onLogout={() => resetAuth("landing")} />;
}

export default App;
