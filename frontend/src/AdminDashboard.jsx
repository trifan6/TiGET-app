import React, { useState, useEffect, useRef, useCallback } from "react";
import Cookies from "js-cookie";
import ManageAccount from "./ManageAccount";

const CHART_COLORS = [
  "#E7462F",
  "#4CAF50",
  "#2196F3",
  "#FFC107",
  "#9C27B0",
  "#00BCD4",
];

export default function AdminDashboard({ onLogout }) {
  const [events, setEvents] = useState([]);
  const [currentView, setCurrentView] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [prefetchedData, setPrefetchedData] = useState([]);
  const eventsPerPage = 5;
  const [activeTab, setActiveTab] = useState(null);

  const [observations, setObservations] = useState([]);
  const userRole = Cookies.get("user_role");

  const handleViewSecurity = async () => {
    setCurrentView("security");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query GetObservations {
              getObservations {
                id
                userId
                reason
                detectedAt
                user {
                  name
                }
              }
            }
          `,
        }),
      });
      const result = await response.json();
      setObservations(result.data.getObservations || []);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      showToast("Failed to fetch security logs", "error");
    }
  };

  const observer = useRef();
  const lastRowRef = useCallback(
    (node) => {
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && prefetchedData.length > 0) {
          setEvents((prev) => [...prev, ...prefetchedData]);
          setPrefetchedData([]);
          setCurrentPage((prev) => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [hasMore, prefetchedData],
  );

  useEffect(() => {
    const loadData = async () => {
      if (!navigator.onLine) return;

      const fetchGraphQL = async (pageToFetch) => {
        const userRole = Cookies.get("user_role");
        const userId = Cookies.get("user_id");

        const variables = { page: pageToFetch, limit: eventsPerPage };
        if (userRole === "ORGANISER" && userId) {
          variables.organiserId = userId;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/graphql`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query GetEvents($page: Int, $limit: Int, $organiserId: ID) {
                getEvents(page: $page, limit: $limit, organiserId: $organiserId) {
                  data {
                    id name description category lineup thumbnail gallery date startTime duration location ageRestriction price capacity sold reviews { id author rating text }
                  }
                  totalPages
                }
              }
            `,
              variables: variables,
            }),
          },
        );
        const result = await response.json();
        return result.data.getEvents;
      };

      try {
        if (currentPage === 1 && events.length === 0) {
          const data1 = await fetchGraphQL(1);
          setEvents(data1.data || []);

          const data2 = await fetchGraphQL(2);
          setPrefetchedData(data2.data || []);
          if (data2.totalPages <= 1) setHasMore(false);
        } else if (currentPage > 1) {
          const data = await fetchGraphQL(currentPage + 1);

          if (data.data && data.data.length > 0) {
            setPrefetchedData(data.data);
          } else {
            setHasMore(false);
          }
        }
      } catch (error) {
        console.error("GraphQL fetching error:", error);
      }
    };
    loadData();
  }, [currentPage]);

  const initialFormState = {
    id: "",
    name: "",
    description: "",
    category: "",
    lineup: [],
    thumbnail: "",
    gallery: [],
    date: "",
    startTime: "",
    duration: "",
    location: "",
    ageRestriction: "All Ages",
    price: "",
    capacity: "",
    sold: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  const [selectedEvent, setSelectedEvent] = useState(null);

  const [reviewForm, setReviewForm] = useState({
    author: "",
    rating: 5,
    text: "",
  });

  const handleAddReview = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation AddReview($eventId: ID!, $author: String!, $rating: Int!, $text: String!) {
              addReview(eventId: $eventId, author: $author, rating: $rating, text: $text) {
                id author rating text
              }
            }
          `,
          variables: {
            eventId: selectedEvent.id,
            author: reviewForm.author,
            rating: parseInt(reviewForm.rating),
            text: reviewForm.text,
          },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0].message);

      const newReview = result.data.addReview;

      const updatedEvent = {
        ...selectedEvent,
        reviews: [...(selectedEvent.reviews || []), newReview],
      };
      setSelectedEvent(updatedEvent);
      setEvents(
        events.map((ev) => (ev.id === selectedEvent.id ? updatedEvent : ev)),
      );

      setReviewForm({ author: "", rating: 5, text: "" });
      showToast("Review added successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to add review.", "error");
    }
  };

  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const syncOfflineQueue = async () => {
      const queue =
        JSON.parse(localStorage.getItem("tiget_offline_queue")) || [];
      if (queue.length === 0) return;

      showToast(`Syncing ${queue.length} offline actions...`, "info");

      for (const item of queue) {
        try {
          if (item.action === "CREATE") {
            const { id, ...realPayload } = item.payload;
            await fetch(`${import.meta.env.VITE_API_URL}/api/events`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(realPayload),
            });
          } else if (item.action === "UPDATE") {
            await fetch(
              `${import.meta.env.VITE_API_URL}/api/events/${item.payload.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.payload),
              },
            );
          } else if (item.action === "DELETE") {
            await fetch(
              `${import.meta.env.VITE_API_URL}/api/events/${item.payload.id}`,
              {
                method: "DELETE",
              },
            );
          }
        } catch (error) {
          console.error("Sync error:", error);
        }
      }

      localStorage.removeItem("tiget_offline_queue");
      showToast("Offline actions synced successfully!", "success");
      setTimeout(() => window.location.reload(), 2000);
    };

    if (navigator.onLine) {
      syncOfflineQueue();
    }

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("You are offline. Changes will be saved locally.", "error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS_URL);

    ws.onopen = () => console.log("🟢 Connected to native WebSocket in Admin!");

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "new_fake_event") {
        console.log("Got new fake event:", message.payload);
        setEvents((prevEvents) => [message.payload, ...prevEvents]);
      }
    };

    return () => ws.close();
  }, []);

  const currentUserId = Cookies.get("user_id");
  const viewedCookieKey = `last_viewed_${currentUserId}`;
  const modifiedCookieKey = `last_modified_${currentUserId}`;

  const [lastViewed, setLastViewed] = useState(
    Cookies.get(viewedCookieKey) || "None",
  );
  const [lastModified, setLastModified] = useState(
    Cookies.get(modifiedCookieKey) || "None",
  );

  const totalRevenue = events.reduce((acc, ev) => acc + ev.price * ev.sold, 0);
  const totalTicketsSold = events.reduce((acc, ev) => acc + ev.sold, 0);
  const totalCapacity = events.reduce((acc, ev) => acc + ev.capacity, 0);
  const overallSellOutRate =
    totalCapacity > 0
      ? Math.round((totalTicketsSold / totalCapacity) * 100)
      : 0;

  let currentPercentage = 0;
  const pieGradientStops = events
    .map((ev, index) => {
      if (totalTicketsSold === 0) return "";
      const percentage = (ev.sold / totalTicketsSold) * 100;
      const start = currentPercentage;
      const end = currentPercentage + percentage;
      currentPercentage = end;
      return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${end}%`;
    })
    .join(", ");

  const pieBackground =
    totalTicketsSold > 0 ? `conic-gradient(${pieGradientStops})` : "#333";

  const startBot = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/faker/start`, {
        method: "POST",
      });
      showToast("🤖 Faker Bot Activated!", "success");
    } catch (error) {
      console.error(error);
    }
  };

  const stopBot = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/faker/stop`, {
        method: "POST",
      });
      showToast("🛑 Faker Bot Deactivated.", "error");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!navigator.onLine) {
      const offlineQueue =
        JSON.parse(localStorage.getItem("tiget_offline_queue")) || [];
      offlineQueue.push({ action: "DELETE", payload: { id } });
      localStorage.setItem("tiget_offline_queue", JSON.stringify(offlineQueue));

      setEvents(events.filter((e) => e.id !== id));
      showToast("Offline: Event deleted locally. Will sync later.", "error");
      return;
    }

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation DeleteEvent($id: ID!) {
              deleteEvent(id: $id)
            }
          `,
          variables: { id },
        }),
      });
      setEvents(events.filter((e) => e.id !== id));
      showToast("Event deleted permanently.", "error");
    } catch (error) {
      console.error("Error deleting:", error);
      showToast("Failed to delete event.", "error");
    }
  };
  const handleEdit = (event) => {
    Cookies.set(viewedCookieKey, event.name, { expires: 7 });
    setLastViewed(event.name);
    setFormData(event);
    setCurrentView("form");
  };

  const handleViewDetail = (event) => {
    Cookies.set(viewedCookieKey, event.name, { expires: 7 });
    setLastViewed(event.name);
    setSelectedEvent(event);
    setCurrentView("detail");
  };

  const handleAdd = () => {
    setFormData(initialFormState);
    setCurrentView("form");
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (formData.price < 0) {
      alert("Validation Error: Price cannot be negative!");
      return;
    }
    if (formData.capacity <= 0) {
      alert("Validation Error: Capacity must be greater than 0!");
      return;
    }
    if (formData.sold > formData.capacity) {
      alert(
        `Validation Error: Sold tickets (${formData.sold}) cannot exceed capacity (${formData.capacity})!`,
      );
      return;
    }
    if (formData.sold < 0) {
      alert("Validation Error: Sold tickets cannot be negative!");
      return;
    }

    if (formData.id) {
      setEvents(events.map((ev) => (ev.id === formData.id ? formData : ev)));
    } else {
      const newEvent = { ...formData, id: `000${events.length + 1}` };
      setEvents([...events, newEvent]);
    }

    if (formData.sold > formData.capacity) {
      alert(
        `Error: Sold tickets (${formData.sold}) cannot exceed capacity (${formData.capacity})!`,
      );
      return;
    }
    if (formData.sold < 0) {
      alert("Error: Sold tickets cannot be negative!");
      return;
    }

    const eventPayload = {
      ...formData,
      organiserId: parseInt(Cookies.get("user_id")),
      lineup:
        typeof formData.lineup === "string"
          ? formData.lineup
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : formData.lineup,
      gallery:
        typeof formData.gallery === "string"
          ? formData.gallery
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : formData.gallery,
    };

    if (!navigator.onLine) {
      const actionType = formData.id ? "UPDATE" : "CREATE";
      const payloadToSave = formData.id
        ? eventPayload
        : { ...eventPayload, id: `offline-${Date.now()}` };

      const offlineQueue =
        JSON.parse(localStorage.getItem("tiget_offline_queue")) || [];
      offlineQueue.push({ action: actionType, payload: payloadToSave });
      localStorage.setItem("tiget_offline_queue", JSON.stringify(offlineQueue));

      if (actionType === "UPDATE") {
        setEvents(
          events.map((ev) => (ev.id === formData.id ? payloadToSave : ev)),
        );
      } else {
        setEvents([...events, payloadToSave]);
      }

      Cookies.set(modifiedCookieKey, formData.name, { expires: 7 });
      setLastModified(formData.name);
      setCurrentView("table");
      showToast(
        `Offline: Event ${actionType.toLowerCase()}d locally. Will sync later.`,
        "info",
      );
      return;
    }
    try {
      const { id, ...inputPayload } = eventPayload;

      inputPayload.price = parseInt(inputPayload.price) || 0;
      inputPayload.capacity = parseInt(inputPayload.capacity) || 0;
      inputPayload.sold = parseInt(inputPayload.sold) || 0;

      if (formData.id) {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/graphql`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              mutation UpdateEvent($id: ID!, $input: EventInput!) {
                updateEvent(id: $id, input: $input) {
                  id name description category lineup thumbnail gallery date startTime duration location ageRestriction price capacity sold
                }
              }
            `,
              variables: { id: formData.id, input: inputPayload },
            }),
          },
        );
        const result = await response.json();

        if (result.errors) throw new Error(result.errors[0].message);
        setEvents(
          events.map((ev) =>
            ev.id === formData.id ? result.data.updateEvent : ev,
          ),
        );
      } else {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/graphql`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              mutation CreateEvent($input: EventInput!) {
                createEvent(input: $input) {
                  id name description category lineup thumbnail gallery date startTime duration location ageRestriction price capacity sold
                }
              }
            `,
              variables: { input: inputPayload },
            }),
          },
        );
        const result = await response.json();

        if (result.errors) throw new Error(result.errors[0].message);
        setEvents([result.data.createEvent, ...events]);
      }

      Cookies.set("last_modified_event", formData.name, { expires: 7 });
      setLastModified(formData.name);
      setCurrentView("table");
      showToast("Event saved successfully!", "success");
    } catch (error) {
      console.error("Server error:", error);
      alert(`GraphQL Error: ${error.message}`);
    }
  };

  return (
    <div className="admin-wrapper">
      <nav className="admin-nav">
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
              setCurrentView("table");
              setActiveTab(null);
            }}
            style={{
              position: "relative",
              zIndex: 10,
              cursor: "pointer",
              color: currentView === "table" && activeTab === null ? "#E7462F" : "",
            }}
          >
            HOME
          </span>
          <span style={{ position: "relative", zIndex: 10 }}>SEARCH</span>
          <span style={{ position: "relative", zIndex: 10 }}>YOUR EVENTS</span>
          
          {userRole === "MASTER_ADMIN" && (
            <span
              onClick={() => {
                handleViewSecurity();
                setActiveTab(null);
              }}
              style={{
                position: "relative",
                zIndex: 10,
                cursor: "pointer",
                color: currentView === "security" && activeTab === null ? "#E7462F" : "",
              }}
            >
              SECUR<span className="keep-i">i</span>TY LOGS
            </span>
          )}
          
          <span
            onClick={() =>
              setActiveTab(activeTab === "account" ? null : "account")
            }
            style={{ 
              position: "relative", 
              zIndex: 10,
              cursor: "pointer",
              color: activeTab === "account" ? "#E7462F" : "",
            }}
          >
            ACCOUNT
          </span>
            
          {activeTab === "account" && (
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-43px",
                width: "615px",
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
                cursor: "default"
              }}
            >
              <ManageAccount
                onClose={() => setActiveTab(null)}
                onLogout={onLogout}
              />
            </div>
          )}
        </div>
      </nav>

      <h1 className="admin-main-title" style={{ marginBottom: "20px" }}>
        ORGAN<span className="keep-i">i</span>SER DASHBOARD
        {!isOnline && (
          <span
            style={{
              fontSize: "1.5rem",
              color: "#E7462F",
              marginLeft: "20px",
              border: "1px solid #E7462F",
              padding: "5px 15px",
              borderRadius: "20px",
              verticalAlign: "middle",
              backgroundColor: "rgba(231, 70, 47, 0.1)",
            }}
          >
            OFFLINE MODE
          </span>
        )}
      </h1>

      <div className="cookie-tracker" style={{ marginBottom: "50px" }}>
        <span>
          LAST V<span className="keep-i">i</span>EWED:{" "}
          <strong className="cookie-highlight">{lastViewed}</strong>
        </span>
        <span className="cookie-divider">|</span>
        <span>
          LAST MOD<span className="keep-i">i</span>F
          <span className="keep-i">i</span>ED:{" "}
          <strong className="cookie-highlight">{lastModified}</strong>
        </span>
      </div>

      {currentView === "security" ? (
        <div
          className="crud-form-container"
          style={{ maxWidth: "1000px", width: "100%" }}
        >
          <div className="compact-form-card" style={{ maxWidth: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ color: "#E7462F", margin: 0 }}>
                🚨 Security Observation List
              </h2>
              <button
                className="btn-compact secondary"
                onClick={() => setCurrentView("table")}
              >
                ← Back to Dashboard
              </button>
            </div>
            <table className="pro-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Violation Reason</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {observations.length > 0 ? (
                  observations.map((obs) => (
                    <tr key={obs.id}>
                      <td style={{ color: "#888" }}>{obs.userId}</td>
                      <td style={{ fontWeight: "bold", color: "#fff" }}>
                        {obs.user?.name || "Unknown"}
                      </td>
                      <td style={{ color: "#E7462F" }}>{obs.reason}</td>
                      <td style={{ color: "#aaa" }}>
                        {new Date(Number(obs.detectedAt)).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        textAlign: "center",
                        color: "#888",
                        padding: "20px",
                      }}
                    >
                      No security threats detected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : currentView === "form" ? (
        <div className="crud-form-container">
          <div className="compact-form-card">
            <h2 className="form-card-title">
              {formData.id ? "Edit Event" : "Create New Event"}
            </h2>
            <form onSubmit={handleSave} className="compact-form">
              <label>Event Name</label>
              <input
                required
                type="text"
                className="compact-input"
                placeholder="e.g. Untold Festival 2026"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <label>Location</label>
              <input
                required
                type="text"
                className="compact-input"
                placeholder="e.g. Cluj Arena"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />

              <label>Category</label>
              <select
                required
                className="compact-input"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                <option value="" disabled>
                  Select a category...
                </option>
                <option value="Festival">Festival</option>
                <option value="Concert">Concert</option>
                <option value="Theater">Theater</option>
                <option value="Sports">Sports</option>
              </select>

              <div className="input-row">
                <div className="input-group">
                  <label>Date</label>
                  <input
                    required
                    type="date"
                    className="compact-input"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>
                <div className="input-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    className="compact-input"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="input-group">
                  <label>Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 Days"
                    className="compact-input"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>Price (Lei)</label>
                  <input
                    required
                    type="number"
                    className="compact-input"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />{" "}
                </div>
                <div className="input-group">
                  <label>Capacity</label>
                  <input
                    required
                    type="number"
                    className="compact-input"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="input-group">
                  <label>Age Limit</label>
                  <select
                    className="compact-input"
                    value={formData.ageRestriction}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ageRestriction: e.target.value,
                      })
                    }
                  >
                    <option value="All Ages">All Ages</option>
                    <option value="3+">3+</option>
                    <option value="7+">7+</option>
                    <option value="12+">12+</option>
                    <option value="16+">16+</option>
                    <option value="18+">18+</option>
                    <option value="21+">21+</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Sold</label>
                  <input
                    required
                    type="number"
                    className="compact-input"
                    value={formData.sold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sold:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <label>Event Description</label>
              <textarea
                className="compact-input"
                style={{
                  resize: "vertical",
                  minHeight: "80px",
                  padding: "10px",
                }}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Tell the attendees what to expect..."
              />

              <label>Lineup / Performers (Comma separated)</label>
              <input
                type="text"
                className="compact-input"
                placeholder="Martin Garrix, Dua Lipa, Skrillex"
                value={
                  Array.isArray(formData.lineup)
                    ? formData.lineup.join(", ")
                    : formData.lineup
                }
                onChange={(e) =>
                  setFormData({ ...formData, lineup: e.target.value })
                }
              />

              <label>Thumbnail Image URL (Main Feed)</label>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                className="compact-input"
                value={formData.thumbnail}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnail: e.target.value })
                }
              />

              <label>Gallery Image URLs (Comma separated)</label>
              <input
                type="text"
                className="compact-input"
                placeholder="https://img1.jpg, https://img2.jpg"
                value={
                  Array.isArray(formData.gallery)
                    ? formData.gallery.join(", ")
                    : formData.gallery
                }
                onChange={(e) =>
                  setFormData({ ...formData, gallery: e.target.value })
                }
              />

              <div className="form-action-buttons">
                <button type="submit" className="btn-compact primary">
                  Save Event
                </button>
                <button
                  type="button"
                  className="btn-compact secondary"
                  onClick={() => setCurrentView("table")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : currentView === "detail" && selectedEvent ? (
        <div
          className="crud-form-container"
          style={{ maxWidth: "900px", width: "100%" }}
        >
          <div className="compact-form-card" style={{ maxWidth: "100%" }}>
            <button
              className="btn-compact secondary"
              style={{
                marginBottom: "30px",
                width: "auto",
                padding: "8px 20px",
              }}
              onClick={() => setCurrentView("table")}
            >
              ← Back to Dashboard
            </button>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: "30px",
                marginBottom: "30px",
              }}
            >
              <div>
                <p
                  style={{
                    color: "#E7462F",
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  EVENT ID: {selectedEvent.id}
                </p>
                <h2
                  style={{
                    fontSize: "3.5rem",
                    color: "#EFEFEF",
                    marginBottom: "10px",
                    lineHeight: "1.1",
                  }}
                >
                  {selectedEvent.name}
                </h2>
                <p
                  style={{
                    color: "#888",
                    fontSize: "1.4rem",
                    fontFamily: "sans-serif",
                  }}
                >
                  Scheduled for:{" "}
                  <span style={{ color: "#fff" }}>{selectedEvent.date}</span>
                </p>
              </div>
              <div style={{ textAlign: "right", minWidth: "150px" }}>
                <p
                  style={{
                    fontSize: "1rem",
                    color: "#888",
                    textTransform: "uppercase",
                    fontFamily: "sans-serif",
                  }}
                >
                  Ticket Price
                </p>
                <p
                  style={{
                    fontSize: "3rem",
                    color: "#E7462F",
                    fontWeight: "bold",
                  }}
                >
                  {selectedEvent.price}{" "}
                  <span style={{ fontSize: "1.2rem", color: "#888" }}>LEI</span>
                </p>
              </div>
            </div>

            <div className="kpi-grid" style={{ marginBottom: "0" }}>
              <div className="kpi-card" style={{ background: "#222226" }}>
                <h3>Tickets Sold</h3>
                <p style={{ color: "#fff" }}>
                  {selectedEvent.sold}{" "}
                  <span
                    style={{
                      fontSize: "1.2rem",
                      color: "#888",
                      fontWeight: "normal",
                    }}
                  >
                    / {selectedEvent.capacity}
                  </span>
                </p>

                <div className="chart-track" style={{ marginTop: "15px" }}>
                  <div
                    className="chart-fill"
                    style={{
                      width: `${(selectedEvent.sold / selectedEvent.capacity) * 100}%`,
                      backgroundColor: "#4CAF50",
                    }}
                  ></div>
                </div>
              </div>

              <div className="kpi-card" style={{ background: "#222226" }}>
                <h3>Gross Event Revenue</h3>
                <p style={{ color: "#4CAF50" }}>
                  {(selectedEvent.price * selectedEvent.sold).toLocaleString()}{" "}
                  <span
                    style={{
                      fontSize: "1.2rem",
                      color: "#888",
                      fontWeight: "normal",
                    }}
                  >
                    LEI
                  </span>
                </p>
              </div>
              <div
                style={{
                  marginTop: "40px",
                  borderTop: "1px solid #333",
                  paddingTop: "30px",
                }}
              >
                <h3 style={{ color: "#fff", marginBottom: "20px" }}>
                  Attendee Reviews
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div
                    style={{
                      background: "#1a1a1d",
                      padding: "20px",
                      borderRadius: "8px",
                      maxHeight: "400px",
                      overflowY: "auto",
                    }}
                  >
                    {selectedEvent.reviews &&
                    selectedEvent.reviews.length > 0 ? (
                      selectedEvent.reviews.map((review) => (
                        <div
                          key={review.id}
                          style={{
                            background: "#242429",
                            padding: "15px",
                            borderRadius: "6px",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "10px",
                            }}
                          >
                            <strong style={{ color: "#EFEFEF" }}>
                              {review.author}
                            </strong>
                            <span style={{ color: "#FFC107" }}>
                              {"★".repeat(review.rating)}
                              {"☆".repeat(5 - review.rating)}
                            </span>
                          </div>
                          <p
                            style={{
                              color: "#aaa",
                              fontSize: "0.9rem",
                              margin: 0,
                            }}
                          >
                            "{review.text}"
                          </p>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#888" }}>
                        No reviews yet. Be the first!
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      background: "#242429",
                      padding: "20px",
                      borderRadius: "8px",
                    }}
                  >
                    <h4 style={{ color: "#fff", marginBottom: "15px" }}>
                      Add a Review
                    </h4>
                    <form
                      onSubmit={handleAddReview}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <input
                        type="text"
                        required
                        placeholder="Your Name"
                        className="compact-input"
                        value={reviewForm.author}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            author: e.target.value,
                          })
                        }
                      />
                      <select
                        className="compact-input"
                        value={reviewForm.rating}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            rating: e.target.value,
                          })
                        }
                      >
                        <option value="5">★★★★★ (5/5)</option>
                        <option value="4">★★★★☆ (4/5)</option>
                        <option value="3">★★★☆☆ (3/5)</option>
                        <option value="2">★★☆☆☆ (2/5)</option>
                        <option value="1">★☆☆☆☆ (1/5)</option>
                      </select>
                      <textarea
                        required
                        placeholder="What did you think of the event?"
                        className="compact-input"
                        style={{ minHeight: "80px", resize: "vertical" }}
                        value={reviewForm.text}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, text: e.target.value })
                        }
                      />
                      <button
                        type="submit"
                        className="btn-compact primary"
                        style={{ marginTop: "10px" }}
                      >
                        Submit Review
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-split-layout">
          <div className="dashboard-left-panel">
            <div className="pro-panel-header">
              <h2>Event Database</h2>
              <div style={{ display: "flex", gap: "15px" }}>
                <button
                  className="btn-compact secondary"
                  style={{
                    background: "#242429",
                    maxWidth: "none",
                    width: "160px",
                  }}
                  onClick={startBot}
                >
                  🤖 Start Bot
                </button>
                <button
                  className="btn-compact secondary"
                  style={{
                    background: "#242429",
                    maxWidth: "none",
                    width: "160px",
                  }}
                  onClick={stopBot}
                >
                  🛑 Stop Bot
                </button>
                <button className="btn-compact primary" onClick={handleAdd}>
                  + Add Event
                </button>
              </div>
            </div>

            <div className="pro-table-container">
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => {
                    const isLastElement = index === events.length - 1;

                    return (
                      <tr
                        key={event.id}
                        ref={isLastElement ? lastRowRef : null}
                      >
                        <td style={{ color: "#888" }}>{event.id}</td>
                        <td
                          className="fw-bold"
                          style={{
                            cursor: "pointer",
                            transition: "color 0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.target.style.color = "#E7462F")
                          }
                          onMouseOut={(e) => (e.target.style.color = "#fff")}
                          onClick={() => handleViewDetail(event)}
                        >
                          {event.name}
                        </td>
                        <td>{event.date}</td>
                        <td>
                          <div className="sales-cell">
                            <span>
                              {event.sold} / {event.capacity}
                            </span>
                            <span className="sales-pct">
                              ({Math.round((event.sold / event.capacity) * 100)}
                              %)
                            </span>
                          </div>
                        </td>
                        <td>
                          {(event.price * event.sold).toLocaleString()} lei
                        </td>
                        <td>
                          <div className="pro-actions">
                            <button
                              className="icon-btn edit"
                              onClick={() => handleEdit(event)}
                            >
                              ✎
                            </button>
                            <button
                              className="icon-btn delete"
                              onClick={() => handleDelete(event.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {hasMore && (
                    <tr>
                      <td
                        colSpan="6"
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#888",
                        }}
                      >
                        Loading more data...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-right-panel">
            <div className="kpi-grid">
              <div className="kpi-card">
                <h3>Gross Revenue</h3>
                <p>
                  {totalRevenue.toLocaleString()}{" "}
                  <span className="currency">LEI</span>
                </p>
              </div>
              <div className="kpi-card">
                <h3>Global Sell-Out</h3>
                <p>
                  {overallSellOutRate}
                  <span className="currency">%</span>
                </p>
              </div>
            </div>

            <div className="chart-card">
              <h3>Volume Share (Tickets Sold)</h3>
              <div className="pie-layout">
                <div
                  className="pie-chart"
                  style={{ background: pieBackground }}
                ></div>
                <div className="pie-legend">
                  {events.map((event, index) => {
                    if (event.sold === 0) return null;
                    return (
                      <div key={event.id} className="legend-item">
                        <span
                          className="legend-color"
                          style={{
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        ></span>
                        <span className="legend-label">{event.name}</span>
                        <span className="legend-value">
                          {Math.round((event.sold / totalTicketsSold) * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h3>Capacity Fulfillment</h3>
              <div className="chart-bars">
                {events.map((event, index) => {
                  const fillPct =
                    Math.min(
                      100,
                      Math.max(0, (event.sold / event.capacity) * 100),
                    ) || 0;
                  return (
                    <div key={event.id} className="chart-row">
                      <div className="chart-label">
                        <span>{event.name}</span>
                        <span style={{ color: "#888" }}>{fillPct}%</span>
                      </div>
                      <div className="chart-track">
                        <div
                          className="chart-fill"
                          style={{
                            width: `${fillPct}%`,
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-container ${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
