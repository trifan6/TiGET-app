import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import AdminDashboard from "./AdminDashboard";
import Cookies from "js-cookie";

describe("Admin Dashboard: Rendering & Live Stats", () => {
  it("renders the side-by-side dashboard initially", () => {
    render(<AdminDashboard onLogout={vi.fn()} />);
    expect(screen.getByText(/Event Database/i)).toBeInTheDocument();
    expect(screen.getByText(/Gross Revenue/i)).toBeInTheDocument();
  });

  it("shows correct empty state and zero-math when all events are deleted", () => {
    render(<AdminDashboard onLogout={vi.fn()} />);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getAllByText("✕")[0]);
    }

    expect(screen.getByText("No events found.")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText(/Page 1 of 1/i)).toBeInTheDocument();
  });

  it("covers pie chart branch when tickets sold is exactly 0 but events exist", () => {
    const { container } = render(<AdminDashboard onLogout={vi.fn()} />);

    fireEvent.click(screen.getByText("+ Add Event"));
    fireEvent.change(container.querySelector('input[type="text"]'), {
      target: { value: "ZeroEvent" },
    });
    fireEvent.change(container.querySelector('input[type="date"]'), {
      target: { value: "2026-01-01" },
    });
    const numberInputs = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numberInputs[0], { target: { value: "10" } });
    fireEvent.change(numberInputs[1], { target: { value: "10" } });
    fireEvent.click(screen.getByText("Save Event"));

    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getAllByText("✕")[0]);
    }

    expect(screen.getAllByText("ZeroEvent").length).toBeGreaterThan(0);
  });
});

describe("Admin Dashboard: CRUD Operations", () => {
  let alertMock;
  beforeEach(() => {
    alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("opens ADD form, cancels, and returns to table", () => {
    render(<AdminDashboard onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Add Event"));
    expect(screen.getByText(/Create New Event/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Event Database")).toBeInTheDocument();
  });

  it("blocks saving with negative price or zero capacity", () => {
    const { container } = render(<AdminDashboard onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Add Event"));

    const nameInput = container.querySelector('input[type="text"]');
    const dateInput = container.querySelector('input[type="date"]');
    const numberInputs = container.querySelectorAll('input[type="number"]');

    fireEvent.change(nameInput, { target: { value: "Test Event" } });
    fireEvent.change(dateInput, { target: { value: "2026-01-01" } });

    fireEvent.change(numberInputs[0], { target: { value: "-10" } });
    fireEvent.change(numberInputs[1], { target: { value: "100" } });
    fireEvent.click(screen.getByText("Save Event"));
    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining("Price cannot be negative"),
    );

    fireEvent.change(numberInputs[0], { target: { value: "10" } });
    fireEvent.change(numberInputs[1], { target: { value: "0" } });
    fireEvent.click(screen.getByText("Save Event"));
    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining("Capacity must be greater than 0"),
    );
  });

  it("adds a new event and tests sold=0 branch in pie chart", () => {
    const { container } = render(<AdminDashboard onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Add Event"));

    fireEvent.change(container.querySelector('input[type="text"]'), {
      target: { value: "Zero Sales Event" },
    });
    fireEvent.change(container.querySelector('input[type="date"]'), {
      target: { value: "2026-01-01" },
    });
    const numberInputs = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numberInputs[0], { target: { value: "100" } });
    fireEvent.change(numberInputs[1], { target: { value: "500" } });

    fireEvent.click(screen.getByText("Save Event"));
    expect(screen.getAllByText("Zero Sales Event")[0]).toBeInTheDocument();
  });

  it("edits an existing event", () => {
    const { container } = render(<AdminDashboard onLogout={vi.fn()} />);
    fireEvent.click(screen.getAllByText("✎")[0]);

    fireEvent.change(container.querySelector('input[type="text"]'), {
      target: { value: "Edited ABBA" },
    });
    fireEvent.click(screen.getByText("Save Event"));

    expect(screen.getAllByText("Edited ABBA")[0]).toBeInTheDocument();
  });
});

describe("Admin Dashboard: Pagination, Details & Interactions", () => {
  it("adds events to enable NEXT button, and navigates pages", () => {
    const { container } = render(<AdminDashboard onLogout={vi.fn()} />);

    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText("+ Add Event"));
      fireEvent.change(container.querySelector('input[type="text"]'), {
        target: { value: `Page Filler ${i}` },
      });
      fireEvent.change(container.querySelector('input[type="date"]'), {
        target: { value: "2026-01-01" },
      });
      const numberInputs = container.querySelectorAll('input[type="number"]');
      fireEvent.change(numberInputs[0], { target: { value: "10" } });
      fireEvent.change(numberInputs[1], { target: { value: "10" } });
      fireEvent.click(screen.getByText("Save Event"));
    }

    const nextBtn = screen.getByText("Next");
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    const prevBtn = screen.getByText("Previous");
    fireEvent.click(prevBtn);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("opens and closes the Pro Detail view", () => {
    render(<AdminDashboard onLogout={vi.fn()} />);

    const eventNames = screen.getAllByText(/Candlelight: Tribut ABBA/i);
    const tableCell = eventNames.find((el) => el.tagName === "TD");
    fireEvent.click(tableCell);

    expect(screen.getByText("← Back to Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Gross Event Revenue/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("← Back to Dashboard"));
    expect(screen.getByText("Event Database")).toBeInTheDocument();
  });

  it("triggers mouse hover effects on the event name", () => {
    render(<AdminDashboard onLogout={vi.fn()} />);
    const eventNames = screen.getAllByText(/Candlelight: Tribut ABBA/i);
    const tableCell = eventNames.find((el) => el.tagName === "TD");

    fireEvent.mouseOver(tableCell);
    fireEvent.mouseOut(tableCell);
  });

  it("calls onLogout when ACCOUNT is clicked", () => {
    const mockLogout = vi.fn();
    render(<AdminDashboard onLogout={mockLogout} />);
    fireEvent.click(screen.getByText(/ACCOUNT \(LOGOUT\)/i));
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
