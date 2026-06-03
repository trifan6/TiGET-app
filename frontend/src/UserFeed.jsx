import React, { useState, useEffect } from "react";
import SocialDrawer from "./SocialDrawer";
import ManageAccount from "./ManageAccount";

export default function UserFeed({ onLogout }) {
  const [view, setView] = useState("feed");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [vibe, setVibe] = useState("");

  const [sortBy, setSortBy] = useState("date-asc");
  const [activeCategory, setActiveCategory] = useState("All");

  const [events, setEvents] = useState([]);

  const [toast, setToast] = useState(null);

  const [activeTab, setActiveTab] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    const fetchBackendEvents = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/graphql`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                getEvents(limit: 100) {
                  data {
                    id
                    name
                    description
                    category
                    lineup
                    thumbnail
                    gallery
                    date
                    startTime
                    duration
                    location
                    ageRestriction
                    price
                    capacity
                    sold
                  }
                }
              }
            `,
            }),
          },
        );

        const result = await response.json();
        if (result.data && result.data.getEvents) {
          setEvents(result.data.getEvents.data);
        }
      } catch (error) {
        console.error("Failed to fetch events from GraphQL", error);
      }
    };
    fetchBackendEvents();
  }, []);

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS_URL);

    ws.onopen = () =>
      console.log("🟢 Connected to native WebSocket in User Feed!");

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "new_fake_event") {
        setEvents((prevEvents) => {
          if (prevEvents.some((e) => e.id === message.payload.id))
            return prevEvents;
          return [message.payload, ...prevEvents];
        });
      }
    };

    return () => ws.close();
  }, []);

  const openEvent = (event) => {
    setSelectedEvent(event);
    setView("event-detail");
  };

  const closeEvent = () => {
    setView("feed");
  };

  const filteredEvents = events
    .filter((event) => {
      const matchesSearch =
        event.name.toLowerCase().includes(vibe.toLowerCase()) ||
        event.category.toLowerCase().includes(vibe.toLowerCase());
      const matchesCategory =
        activeCategory === "All" || event.category === activeCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "date-asc") return new Date(a.date) - new Date(b.date);
      if (sortBy === "date-desc") return new Date(b.date) - new Date(a.date);
      return 0;
    });

  return (
    <div className="user-wrapper">
      <nav className="admin-nav user-nav">
        <div className="nav-logo">
          <img src="/logo.png" alt="TiGET Logo" />
        </div>

        <div
          className="nav-links"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            onClick={() => {
              closeEvent();
              setActiveTab(null);
            }}
            className="nav-clickable"
            style={{
              position: "relative",
              zIndex: 10,
              color: activeTab === null ? "#E7462F" : "",
            }}
          >
            HOME
          </span>

          <span
            onClick={() =>
              setActiveTab(activeTab === "tickets" ? null : "tickets")
            }
            className="nav-clickable"
            style={{
              position: "relative",
              zIndex: 10,
              color: activeTab === "tickets" ? "#E7462F" : "",
            }}
          >
            YOUR T<span className="keep-i">i</span>CKETS
          </span>

          <span
            onClick={() =>
              setActiveTab(activeTab === "friends" ? null : "friends")
            }
            className="nav-clickable"
            style={{
              position: "relative",
              zIndex: 10,
              color: activeTab === "friends" ? "#E7462F" : "",
            }}
          >
            FR<span className="keep-i">i</span>ENDS
          </span>

          <span
            onClick={() =>
              setActiveTab(activeTab === "account" ? null : "account")
            }
            className="nav-clickable"
            style={{ position: "relative", zIndex: 10 }}
          >
            ACCOUNT
          </span>

          {activeTab && (
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-43px",
                width: "480px",
                height: "800px",
                backgroundColor: "rgba(21, 21, 27, 0.65)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderRadius: "30px",
                boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
                zIndex: 5,
                display: "flex",
                flexDirection: "column",
                paddingTop: "60px",
                overflow: "hidden",
              }}
            >
              {activeTab === "friends" && (
                <SocialDrawer
                  onClose={() => setActiveTab(null)}
                  showToast={showToast}
                />
              )}
              {activeTab === "account" && (
                <ManageAccount
                  onClose={() => setActiveTab(null)}
                  onLogout={onLogout}
                />
              )}
            </div>
          )}
        </div>
      </nav>

      {view === "feed" ? (
        <>
          <div className="vibe-hero-container">
            <h1 className="vibe-title">
              TELL US YOUR PLANS AND WE W<span className="keep-i">i</span>LL
              MAKE THEM HAPPEN
            </h1>

            <div className="vibe-search-area">
              <div className="vibe-upward-glow"></div>
              <input
                type="text"
                className="vibe-input"
                placeholder="what's the vibe?"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
              />
            </div>
          </div>

          <div className="feed-container">
            <h1 className="feed-section-title">
              TREND<span className="keep-i">i</span>NG
            </h1>
            <div className="event-grid">
              {filteredEvents.map((event) => (
                <div key={event.id} className="event-card">
                  <div
                    className="card-image"
                    style={{
                      backgroundImage: `url(${event.thumbnail || "/landing_bg.jpg"})`,
                    }}
                    onClick={() => openEvent(event)}
                  ></div>
                  <div className="card-info">
                    <span className="card-date">
                      {event.date} {event.startTime && `• ${event.startTime}`}
                    </span>
                    <h3 onClick={() => openEvent(event)}>{event.name}</h3>
                    <button
                      className="btn-card-cart"
                      disabled={event.sold >= event.capacity}
                      style={{
                        opacity: event.sold >= event.capacity ? 0.5 : 1,
                        cursor:
                          event.sold >= event.capacity
                            ? "not-allowed"
                            : "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast(`Added ${event.name} to cart!`, "success");
                      }}
                    >
                      ADD TO CART • {event.price} LEI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="detail-page-wrapper">
          <div
            className="detail-hero-diagonal"
            style={{
              backgroundImage: `url(${selectedEvent.thumbnail || "/landing_bg.jpg"})`,
            }}
          >
            <div className="diagonal-overlay"></div>

            <button className="btn-back-ghost" onClick={closeEvent}>
              ← BACK
            </button>

            <div className="detail-hero-content">
              <h1 className="detail-title-massive">{selectedEvent.name}</h1>
              <div className="detail-meta-row">
                <span>{selectedEvent.date}</span>
                <span>{selectedEvent.location}</span>
              </div>
              <button
                className="btn-price-drop"
                disabled={selectedEvent.sold >= selectedEvent.capacity}
                style={{
                  opacity:
                    selectedEvent.sold >= selectedEvent.capacity ? 0.5 : 1,
                  cursor:
                    selectedEvent.sold >= selectedEvent.capacity
                      ? "not-allowed"
                      : "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  showToast(`Added ${selectedEvent.name} to cart!`, "success");
                }}
              >
                PR<span className="keep-i">i</span>CE DROP -{" "}
                {selectedEvent.price} LE
                <span className="keep-i">i</span>
              </button>
            </div>
          </div>

          <div className="detail-body-split">
            <div className="detail-image-collage">
              {(function () {
                let images = [];

                if (Array.isArray(selectedEvent.gallery)) {
                  images = [...selectedEvent.gallery];
                } else if (
                  typeof selectedEvent.gallery === "string" &&
                  selectedEvent.gallery.trim() !== ""
                ) {
                  images = selectedEvent.gallery
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                }

                if (images.length === 0) {
                  images = [
                    selectedEvent.thumbnail,
                    selectedEvent.thumbnail,
                    selectedEvent.thumbnail,
                  ];
                } else if (images.length === 1) {
                  images = [images[0], images[0], images[0]];
                } else if (images.length === 2) {
                  images = [images[0], images[1], images[0]];
                } else {
                  images = images.slice(0, 3);
                }

                return images.map((imgUrl, i) => (
                  <img
                    key={i}
                    src={imgUrl || "/landing_bg.jpg"}
                    alt={`Event snapshot ${i + 1}`}
                    className="collage-img"
                  />
                ));
              })()}
            </div>
            <div className="detail-glass-circle">
              <h2 className="detail-section-title">About the event</h2>
              <p className="detail-p">
                {selectedEvent.description ||
                  "An unforgettable experience awaits you. Secure your tickets now before they run out."}
              </p>

              <h2 className="detail-section-title">Lineup / Performers:</h2>
              <ul className="detail-program-list">
                {(selectedEvent.lineup && selectedEvent.lineup.length > 0
                  ? selectedEvent.lineup
                  : ["TBA"]
                ).map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>

              <h2 className="detail-section-title">General Info:</h2>
              <p className="detail-p">
                ⏳ Duration: {selectedEvent.duration || "TBA"}
              </p>
              <p className="detail-p">
                👤 Age requirement:{" "}
                {selectedEvent.ageRestriction || "All ages welcome."}
              </p>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-container ${toast.type}`}>
          <span>✓</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
