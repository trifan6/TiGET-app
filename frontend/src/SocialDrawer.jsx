import React, { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";

export default function SocialDrawer({ onClose, showToast }) {
  const currentUserId = String(Cookies.get("user_id"));

  const [recentUsers, setRecentUsers] = useState([]);

  const [currentView, setCurrentView] = useState("recent"); 

  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatName, setActiveChatName] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const fetchRecents = async () => {
    if (!currentUserId) return;
    try {
      const response = await fetch(
        `http://localhost:3000/api/chat/recents/${currentUserId}`,
      );
      const data = await response.json();
      setRecentUsers(data);
    } catch (error) {
      console.error("Failed to fetch recents:", error);
    }
  };

  useEffect(() => {
    fetchRecents();
  }, [currentUserId]);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null); 

  useEffect(() => {
    if (!currentUserId) return; 

    const ws = new WebSocket("ws://localhost:3000");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "register", userId: currentUserId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "new_message" || data.type === "message_sent") {
        setMessages((prev) => [...prev, data.payload]);
        fetchRecents();

        if (data.type === "new_message") {
          showToast(`📩 New message received!`, "success");
        }
      }
    };

    return () => ws.close();
  }, [currentUserId]);

  useEffect(() => {
    if (currentView !== "chat" || !activeChatId || !currentUserId) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/chat/${currentUserId}/${activeChatId}`,
        );
        const history = await response.json();
        setMessages(history);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    fetchHistory();
  }, [currentView, activeChatId, currentUserId]);

  useEffect(() => {
    if (currentView === "chat" && chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentView]);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (q.trim().length > 0) {
      try {
        const response = await fetch(
          `http://localhost:3000/api/chat/search?q=${q}`,
        );
        const data = await response.json();
        setSearchResults(
          data.filter((user) => String(user.id) !== currentUserId),
        );
      } catch (error) {
        console.error("Search failed:", error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatId || !wsRef.current) return;

    wsRef.current.send(
      JSON.stringify({
        type: "private_message",
        payload: {
          senderId: currentUserId,
          receiverId: activeChatId,
          text: inputText,
        },
      }),
    );
    setInputText("");
  };

  const openChatWithUser = (id, name) => {
    setActiveChatId(String(id));
    setActiveChatName(name);
    setCurrentView("chat");
  };

  const displayedMessages = messages.filter(
    (m) =>
      (m.senderId === currentUserId && m.receiverId === activeChatId) ||
      (m.senderId === activeChatId && m.receiverId === currentUserId),
  );

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
      <div
        style={{
          padding: "15px",
        }}
      >
        {currentView === "chat" ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={() => setCurrentView("recent")}
              style={{
                background: "none",
                border: "none",
                color: "#E7462F",
                cursor: "pointer",
                fontWeight: "600", 
                fontSize: "1.05rem", 
              }}
            >
              ← Back
            </button>
            <h3 style={{ margin: 0, color: "#EFEFEF", fontSize: "1.2rem", fontWeight: "600" }}>
              {activeChatName}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                cursor: "pointer",
                fontSize: "1.2rem"
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(0,0,0,0.3)",
              borderRadius: "30px",
              padding: "4px",
            }}
          >
            <button
              onClick={() => setCurrentView("recent")}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "none",
                borderRadius: "20px",
                cursor: "pointer",
                backgroundColor:
                  currentView === "recent"
                    ? "rgba(255,255,255,0.1)"
                    : "transparent",
                color: currentView === "recent" ? "#fff" : "#888",
                fontWeight: "600", 
                fontSize: "0.95rem", 
                letterSpacing: "1px" 
              }}
            >
              RECENTS
            </button>
            <button
              onClick={() => setCurrentView("search")}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "none",
                borderRadius: "20px",
                cursor: "pointer",
                backgroundColor:
                  currentView === "search"
                    ? "rgba(255,255,255,0.1)"
                    : "transparent",
                color: currentView === "search" ? "#fff" : "#888",
                fontWeight: "600", 
                fontSize: "0.95rem",
                letterSpacing: "1px"
              }}
            >
              SEARCH
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {currentView === "recent" && (
          <div style={{ padding: "15px" }}>
            {recentUsers.length === 0 && (
              <p style={{ color: "#555", textAlign: "center", fontSize: "1.05rem" }}>
                No chats yet.
              </p>
            )}
            {recentUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  borderRadius: "20px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: "600", 
                      fontSize: "1.1rem"
                    }}
                  >
                    {user.name}
                  </span>
                  <span style={{ color: "#aaa", fontSize: "0.95rem" }}>
                    {user.latestMessage.length > 25
                      ? user.latestMessage.substring(0, 25) + "..."
                      : user.latestMessage}
                  </span>
                </div>
                <button
                  onClick={() => openChatWithUser(user.id, user.name)}
                  style={{
                    background: "none",
                    border: "1px solid #E7462F",
                    color: "#E7462F",
                    borderRadius: "50%",
                    width: "38px",
                    height: "38px",
                    cursor: "pointer",
                    fontSize: "1.1rem"
                  }}
                >
                  💬
                </button>
              </div>
            ))}
          </div>
        )}

        {currentView === "search" && (
          <div style={{ padding: "15px" }}>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearch}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.2)",
                backgroundColor: "rgba(0,0,0,0.3)",
                color: "#fff",
                outline: "none",
                marginBottom: "15px",
                fontSize: "1.05rem" 
              }}
            />
            {searchResults.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  borderRadius: "20px",
                  marginBottom: "8px",
                }}
              >
                <span style={{ color: "#fff", fontWeight: "600", fontSize: "1.1rem" }}>
                  {user.name}
                </span>
                <button
                  onClick={() => openChatWithUser(user.id, user.name)}
                  style={{
                    backgroundColor: "#E7462F",
                    border: "none",
                    color: "#fff",
                    borderRadius: "20px",
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: "1rem", 
                    fontWeight: "600"
                  }}
                >
                  Message
                </button>
              </div>
            ))}
          </div>
        )}

        {currentView === "chat" && (
          <>
            <div
              ref={chatContainerRef}
              style={{
                flex: 1,
                padding: "15px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {displayedMessages.map((msg, idx) => {
                const isMe = String(msg.senderId) === currentUserId;
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      backgroundColor: isMe
                        ? "#E7462F"
                        : "rgba(255,255,255,0.1)",
                      color: "#fff",
                      padding: "10px 14px",
                      borderRadius: "14px",
                      borderBottomRightRadius: isMe ? "2px" : "14px",
                      borderBottomLeftRadius: isMe ? "14px" : "2px",
                      fontSize: "1.05rem", 
                    }}
                  >
                    {msg.text}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: "12px",
                backgroundColor: "rgba(0,0,0,0.4)",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                gap: "8px",
              }}
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type..."
                style={{
                  flex: 1,
                  padding: "12px 15px",
                  borderRadius: "20px",
                  border: "none",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  outline: "none",
                  fontSize: "1.05rem" 
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: "#E7462F",
                  border: "none",
                  color: "#fff",
                  borderRadius: "50%",
                  width: "44px", 
                  height: "44px",
                  cursor: "pointer",
                  fontSize: "1.2rem"
                }}
              >
                ➤
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}