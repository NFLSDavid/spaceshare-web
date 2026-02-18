import { describe, it, expect, vi, beforeEach } from "vitest";
import { DomainEventBus } from "../events/bus";

// Use a fresh bus per test to avoid cross-test handler pollution
let bus: DomainEventBus;
beforeEach(() => {
  bus = new DomainEventBus();
});

describe("DomainEventBus", () => {
  it("calls a registered handler when the matching event is emitted", async () => {
    const handler = vi.fn();
    bus.on("user.registered", handler);

    bus.emit("user.registered", {
      email: "a@b.com",
      firstName: "Alice",
      verifyUrl: "http://x/verify",
    });

    await new Promise((r) => setTimeout(r, 0)); // flush microtasks
    expect(handler).toHaveBeenCalledWith({
      email: "a@b.com",
      firstName: "Alice",
      verifyUrl: "http://x/verify",
    });
  });

  it("calls multiple handlers registered for the same event", async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("user.registered", h1);
    bus.on("user.registered", h2);

    bus.emit("user.registered", {
      email: "a@b.com",
      firstName: "Alice",
      verifyUrl: "http://x",
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("does not call handlers registered for a different event", async () => {
    const handler = vi.fn();
    bus.on("listing.created", handler);

    bus.emit("user.registered", {
      email: "a@b.com",
      firstName: "Alice",
      verifyUrl: "http://x",
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not throw synchronously when a handler rejects", () => {
    bus.on("user.registered", async () => {
      throw new Error("Observer error");
    });

    expect(() =>
      bus.emit("user.registered", {
        email: "a@b.com",
        firstName: "Alice",
        verifyUrl: "http://x",
      }),
    ).not.toThrow();
  });

  it("logs an error when a handler rejects", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    bus.on("user.registered", async () => {
      throw new Error("fail");
    });

    bus.emit("user.registered", {
      email: "a@b.com",
      firstName: "Alice",
      verifyUrl: "http://x",
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("user.registered"),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("continues calling remaining handlers after one rejects", async () => {
    const good = vi.fn();
    bus.on("user.registered", async () => {
      throw new Error("first fails");
    });
    bus.on("user.registered", good);

    bus.emit("user.registered", {
      email: "a@b.com",
      firstName: "Alice",
      verifyUrl: "http://x",
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(good).toHaveBeenCalledTimes(1);
  });

  it("emits nothing and does not throw when no handlers are registered", () => {
    expect(() =>
      bus.emit("user.forgot_password", {
        email: "a@b.com",
        firstName: "Alice",
        resetUrl: "http://x/reset",
      }),
    ).not.toThrow();
  });
});
