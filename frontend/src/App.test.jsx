import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import App from "./App";

describe("TiGET App: Global Routing", () => {
  it("renders the landing page initially", () => {
    render(<App />);
    expect(screen.getByText(/Welcome to the smarter way/i)).toBeInTheDocument();
  });

  it("navigates to Auth screen when GET STARTED is clicked", () => {
    render(<App />);
    fireEvent.click(screen.getByText(/GET STARTED/i));
    expect(
      screen.getAllByRole("button", { name: /login/i })[0],
    ).toBeInTheDocument();
  });
});

describe("TiGET App: Auth Menu Flow", () => {
  beforeEach(() => render(<App />));
  const navigateToAuth = () =>
    fireEvent.click(screen.getByText(/GET STARTED/i));

  it("toggles to Login form and can go back to Auth Menu", () => {
    navigateToAuth();
    fireEvent.click(screen.getAllByRole("button", { name: /login/i })[0]);
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /← back/i }));
    expect(
      screen.getByRole("button", { name: /become an organ.*ser/i }),
    ).toBeInTheDocument();
  });

  it("toggles to Register form and can go back", () => {
    navigateToAuth();
    fireEvent.click(screen.getAllByRole("button", { name: /register/i })[0]);
    expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /← back/i }));
    expect(
      screen.getByRole("button", { name: /become an organ.*ser/i }),
    ).toBeInTheDocument();
  });

  it("toggles to Organiser form and can go back", () => {
    navigateToAuth();
    fireEvent.click(
      screen.getByRole("button", { name: /become an organ.*ser/i }),
    );
    expect(screen.getByPlaceholderText(/tax ID/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /← back/i }));
    expect(
      screen.getByRole("button", { name: /become an organ.*ser/i }),
    ).toBeInTheDocument();
  });
});

describe("TiGET App: Validation and User Routing", () => {
  let alertMock;
  beforeEach(() => {
    alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<App />);
    fireEvent.click(screen.getByText(/GET STARTED/i));
  });

  it("blocks Login with empty fields and invalid emails", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /login/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(alertMock).toHaveBeenCalledWith(
      "Error: Please enter your credentials.",
    );

    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(alertMock).toHaveBeenCalledWith(
      "Error: Please enter a valid email address.",
    );
  });

  it("logs in as User and routes to User Feed", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /login/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: "user@gmail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "pass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByPlaceholderText(/what's the vibe/i)).toBeInTheDocument();
  });

  it("logs in as Admin and routes to Admin Dashboard", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /login/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: "admin@tiget.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "pass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(/ORGAN.*SER DASHBOARD/i)).toBeInTheDocument();
  });

  it("blocks Register with empty fields or short password", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /register/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(alertMock).toHaveBeenCalledWith(
      "Error: Please fill out all required fields.",
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "user@gmail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(alertMock).toHaveBeenCalledWith(
      "Error: Password must be at least 6 characters.",
    );
  });

  it("Registers as User and routes to User Feed", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /register/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "newuser@gmail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "longpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(screen.getByPlaceholderText(/what's the vibe/i)).toBeInTheDocument();
  });

  it("Registers as Admin and routes to Admin Dashboard", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /register/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "admin@tiget.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "longpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(screen.getByText(/ORGAN.*SER DASHBOARD/i)).toBeInTheDocument();
  });

  it("Registers as Organiser and ALWAYS routes to Admin Dashboard", () => {
    fireEvent.click(
      screen.getByRole("button", { name: /become an organ.*ser/i }),
    );
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "org@gmail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "longpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(screen.getByText(/ORGAN.*SER DASHBOARD/i)).toBeInTheDocument();
  });

  it("successfully logs out from User Feed and resets state", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /login/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: "user@gmail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "pass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.click(screen.getByText("ACCOUNT"));
    expect(screen.getByText(/Welcome to the smarter way/i)).toBeInTheDocument();
  });

  it("successfully logs out from Admin Dashboard and resets state", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /login/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: "admin@tiget.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "pass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.click(screen.getByText(/ACCOUNT \(LOGOUT\)/i));
    expect(screen.getByText(/Welcome to the smarter way/i)).toBeInTheDocument();
  });

  it("covers Register form invalid email branch", () => {
    fireEvent.click(screen.getAllByRole("button", { name: /register/i })[0]);
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "bademail" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "pass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining("valid email address"),
    );
  });

  it("covers Organiser form invalid email and short password branches", () => {
    fireEvent.click(
      screen.getByRole("button", { name: /become an organ.*ser/i }),
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "bademail" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "pass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining("valid email address"),
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "org@gmail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining("at least 6 characters"),
    );
  });

  describe("The Final 1% Coverage Sweep", () => {
    let alertMock;
    beforeEach(() => {
      alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    });

    it("mercilessly tests every single error branch in the Register form", () => {
      render(<App />);
      fireEvent.click(screen.getByText(/GET STARTED/i));
      fireEvent.click(screen.getAllByRole("button", { name: /register/i })[0]);

      const emailInput = screen.getByPlaceholderText(/email/i);
      const passInput = screen.getByPlaceholderText(/password/i);
      const createBtn = screen.getByRole("button", { name: /create/i });

      fireEvent.change(emailInput, { target: { value: "" } });
      fireEvent.change(passInput, { target: { value: "" } });
      fireEvent.click(createBtn);
      expect(alertMock).toHaveBeenCalledWith(
        "Error: Please fill out all required fields.",
      );

      fireEvent.change(emailInput, {
        target: { value: "this-is-not-an-email" },
      });
      fireEvent.change(passInput, { target: { value: "validpass123" } });
      fireEvent.click(createBtn);
      expect(alertMock).toHaveBeenCalledWith(
        "Error: Please enter a valid email address.",
      );

      fireEvent.change(emailInput, { target: { value: "perfect@email.com" } });
      fireEvent.change(passInput, { target: { value: "123" } });
      fireEvent.click(createBtn);
      expect(alertMock).toHaveBeenCalledWith(
        "Error: Password must be at least 6 characters.",
      );
    });
  });

  describe("TiGET App: The Final Organiser Branch (Line 130)", () => {
    let alertMock;
    beforeEach(() => {
      alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    });

    it("mercilessly hits the Organiser invalid email branch", () => {
      render(<App />);

      fireEvent.click(screen.getAllByText(/GET STARTED/i)[0]);

      fireEvent.click(
        screen.getAllByRole("button", { name: /become an organ.*ser/i })[0],
      );

      const emailInput = screen.getAllByPlaceholderText(/email/i)[0];
      const passInput = screen.getAllByPlaceholderText(/password/i)[0];

      fireEvent.change(emailInput, {
        target: { value: "this-is-a-terrible-email" },
      });
      fireEvent.change(passInput, { target: { value: "perfectpassword123" } });

      fireEvent.click(screen.getAllByRole("button", { name: /create/i })[0]);

      expect(alertMock).toHaveBeenCalledWith(
        "Error: Please enter a valid email address.",
      );
    });
  });
});
