import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import UserFeed from "./UserFeed";

describe("User Feed: UI and Interactions", () => {
  let alertMock;
  let scrollToMock;

  beforeEach(() => {
    alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    scrollToMock = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("renders the initial feed and nav bar", () => {
    render(<UserFeed onLogout={vi.fn()} />);
    expect(screen.getByText(/TELL US YOUR PLANS/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/what's the vibe\?/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Candlelight/i)).toBeInTheDocument();
  });

  it("allows typing in the vibe search bar", () => {
    render(<UserFeed onLogout={vi.fn()} />);
    const input = screen.getByPlaceholderText(/what's the vibe\?/i);
    fireEvent.change(input, { target: { value: "Techno music" } });
    expect(input.value).toBe("Techno music");
  });

  it("adds an event to cart and prevents detail view opening", () => {
    render(<UserFeed onLogout={vi.fn()} />);
    const cartButtons = screen.getAllByText(/ADD TO CART/i);

    fireEvent.click(cartButtons[0]);
    expect(alertMock).toHaveBeenCalledWith(
      "Added Candlelight: Tribut ABBA & Mulți Alții to cart!",
    );
    expect(screen.queryByText("← BACK")).not.toBeInTheDocument();
  });

  // COVERAGE FIX: We never tested clicking the actual image poster to open the event!
  it("opens detail view when clicking the image poster", () => {
    const { container } = render(<UserFeed onLogout={vi.fn()} />);
    const images = container.querySelectorAll(".card-image");

    fireEvent.click(images[0]); // Clicks the image instead of the title
    expect(screen.getByText("← BACK")).toBeInTheDocument();
  });

  it("opens detail view with full data and scrolls to top", async () => {
    render(<UserFeed onLogout={vi.fn()} />);
    const eventTitle = screen.getAllByText(/Candlelight/i)[0];
    fireEvent.click(eventTitle);

    expect(screen.getByText("← BACK")).toBeInTheDocument();
    expect(screen.getByText(/Dancing Queen/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalled();
    });
  });

  it("opens detail view with fallback data for incomplete events", () => {
    render(<UserFeed onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/UNA NOCHE CALIENTE/i));

    expect(
      screen.getByText(/An unforgettable experience awaits you/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Live performance/i)).toBeInTheDocument();
  });

  it("navigates back to feed from detail view via BACK button", () => {
    render(<UserFeed onLogout={vi.fn()} />);
    fireEvent.click(screen.getAllByText(/Candlelight/i)[0]);
    expect(screen.getByText("← BACK")).toBeInTheDocument();

    fireEvent.click(screen.getByText("← BACK"));
    expect(
      screen.getByPlaceholderText(/what's the vibe\?/i),
    ).toBeInTheDocument();
  });

  it("navigates back to feed from detail view via HOME nav link", () => {
    render(<UserFeed onLogout={vi.fn()} />);
    fireEvent.click(screen.getAllByText(/Candlelight/i)[0]);
    fireEvent.click(screen.getByText("HOME"));
    expect(
      screen.getByPlaceholderText(/what's the vibe\?/i),
    ).toBeInTheDocument();
  });

  it("handles buying a ticket from the detail view", () => {
    render(<UserFeed onLogout={vi.fn()} />);
    fireEvent.click(screen.getAllByText(/Candlelight/i)[0]);
    fireEvent.click(screen.getByText(/PRICE DROP/i));
    expect(alertMock).toHaveBeenCalledWith("Ticket Reserved!");
  });

  it("calls onLogout when ACCOUNT is clicked", () => {
    const mockLogout = vi.fn();
    render(<UserFeed onLogout={mockLogout} />);
    fireEvent.click(screen.getByText("ACCOUNT"));
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
