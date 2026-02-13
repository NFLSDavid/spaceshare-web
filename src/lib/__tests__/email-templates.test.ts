import { describe, it, expect } from "vitest";
import {
  reservationStatusEmail,
  newReservationRequestEmail,
  newListingMatchEmail,
  emailVerificationEmail,
  passwordResetEmail,
} from "../email-templates";

describe("reservationStatusEmail", () => {
  it("has correct subject for APPROVED", () => {
    const result = reservationStatusEmail("Alice", "Nice Storage", "APPROVED", {
      start: "Jan 1, 2025",
      end: "Jan 5, 2025",
    });
    expect(result.subject).toBe("Reservation approved: Nice Storage");
  });

  it("has correct subject for DECLINED", () => {
    const result = reservationStatusEmail("Alice", "Nice Storage", "DECLINED", {
      start: "Jan 1, 2025",
      end: "Jan 5, 2025",
    });
    expect(result.subject).toBe("Reservation declined: Nice Storage");
  });

  it("HTML contains green color for APPROVED", () => {
    const result = reservationStatusEmail("Alice", "Title", "APPROVED", {
      start: "Jan 1",
      end: "Jan 5",
    });
    expect(result.html).toContain("#16a34a");
  });

  it("HTML contains red color for DECLINED", () => {
    const result = reservationStatusEmail("Alice", "Title", "DECLINED", {
      start: "Jan 1",
      end: "Jan 5",
    });
    expect(result.html).toContain("#dc2626");
  });

  it("HTML contains recipient name and dates", () => {
    const result = reservationStatusEmail("Bob", "Storage", "APPROVED", {
      start: "Feb 1",
      end: "Feb 10",
    });
    expect(result.html).toContain("Bob");
    expect(result.html).toContain("Feb 1");
    expect(result.html).toContain("Feb 10");
  });

  it("HTML contains SpaceShare layout", () => {
    const result = reservationStatusEmail("A", "B", "APPROVED", {
      start: "x",
      end: "y",
    });
    expect(result.html).toContain("SpaceShare");
  });
});

describe("newReservationRequestEmail", () => {
  it("has correct subject", () => {
    const result = newReservationRequestEmail("Host", "Client", "My Listing", 5, {
      start: "Jan 1",
      end: "Jan 5",
    });
    expect(result.subject).toBe("New reservation request: My Listing");
  });

  it("HTML contains host, client and space", () => {
    const result = newReservationRequestEmail("HostName", "ClientName", "Title", 3, {
      start: "Jan 1",
      end: "Jan 2",
    });
    expect(result.html).toContain("HostName");
    expect(result.html).toContain("ClientName");
    expect(result.html).toContain("3 m³");
  });
});

describe("newListingMatchEmail", () => {
  it("has correct subject", () => {
    const result = newListingMatchEmail("User", "Great Spot", 10, 2.5, "123 Main St");
    expect(result.subject).toBe("New listing nearby: Great Spot");
  });

  it("HTML contains price, distance, address", () => {
    const result = newListingMatchEmail("User", "Title", 15.5, 3.2, "456 Elm St");
    expect(result.html).toContain("$15.50");
    expect(result.html).toContain("3.2 km");
    expect(result.html).toContain("456 Elm St");
  });
});

describe("emailVerificationEmail", () => {
  it("has correct subject", () => {
    const result = emailVerificationEmail("Alice", "https://example.com/verify?token=abc");
    expect(result.subject).toBe("Verify your SpaceShare email");
  });

  it("HTML contains verify URL and name", () => {
    const result = emailVerificationEmail("Bob", "https://example.com/verify?token=xyz");
    expect(result.html).toContain("Bob");
    expect(result.html).toContain("https://example.com/verify?token=xyz");
  });

  it("HTML wraps in SpaceShare layout", () => {
    const result = emailVerificationEmail("A", "url");
    expect(result.html).toContain("SpaceShare");
  });
});

describe("passwordResetEmail", () => {
  it("has correct subject", () => {
    const result = passwordResetEmail("Alice", "https://example.com/reset?token=abc");
    expect(result.subject).toBe("Reset your SpaceShare password");
  });

  it("HTML contains reset URL and name", () => {
    const result = passwordResetEmail("Charlie", "https://example.com/reset?token=def");
    expect(result.html).toContain("Charlie");
    expect(result.html).toContain("https://example.com/reset?token=def");
  });
});
