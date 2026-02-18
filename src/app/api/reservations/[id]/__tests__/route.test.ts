import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/email/sender", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email/templates", () => ({
  reservationStatusEmail: vi.fn().mockReturnValue({ subject: "Status", html: "<p>s</p>" }),
  reservationCancelledByClientEmail: vi.fn().mockReturnValue({ subject: "Cancelled", html: "<p>c</p>" }),
}));
vi.mock("date-fns", () => ({
  format: vi.fn(() => "Jan 1, 2025"),
}));

import { getServerSession } from "next-auth";
import { sendEmail } from "@/lib/email/sender";
const { PATCH } = await import("../../[id]/route");

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const baseReservation = {
  id: "r1",
  hostId: "host1",
  clientId: "client1",
  listingId: "l1",
  status: "PENDING",
  spaceRequested: 5,
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-01-05"),
  listing: { id: "l1", title: "Test", spaceAvailable: 20, bookings: [] },
};

describe("PATCH /api/reservations/[id]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    vi.mocked(sendEmail).mockReset();
    prismaMock.reservation.findUnique.mockReset();
    prismaMock.reservation.update.mockReset();
    prismaMock.booking.create.mockReset();
    prismaMock.booking.findMany.mockReset();
    prismaMock.booking.deleteMany.mockReset();
    prismaMock.user.findUnique.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "APPROVED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 404 when reservation not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "APPROVED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 403 when user is neither host nor client", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "stranger" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue(baseReservation);
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "APPROVED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("host can APPROVE (creates booking with availability check)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue(baseReservation);
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.booking.create.mockResolvedValue({});
    prismaMock.reservation.update.mockResolvedValue({
      ...baseReservation,
      status: "APPROVED",
      listing: { id: "l1", title: "Test", photos: [], latitude: 0, longitude: 0, price: 10 },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ email: "c@test.com", firstName: "Client" });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "APPROVED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: "l1",
          reservedSpace: 5,
        }),
      })
    );
  });

  it("host can DECLINE", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue(baseReservation);
    prismaMock.reservation.update.mockResolvedValue({
      ...baseReservation,
      status: "DECLINED",
      listing: { id: "l1", title: "Test", photos: [], latitude: 0, longitude: 0, price: 10 },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ email: "c@test.com", firstName: "Client" });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "DECLINED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("host can COMPLETE when end date has passed", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      ...baseReservation,
      status: "APPROVED",
      endDate: new Date("2020-01-05"),
    });
    prismaMock.reservation.update.mockResolvedValue({
      ...baseReservation,
      status: "COMPLETED",
      listing: { id: "l1", title: "Test", photos: [], latitude: 0, longitude: 0, price: 10 },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "COMPLETED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("client can CANCEL (deletes booking)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "client1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue({ ...baseReservation, status: "APPROVED" });
    prismaMock.booking.deleteMany.mockResolvedValue({});
    prismaMock.reservation.update.mockResolvedValue({
      ...baseReservation,
      status: "CANCELLED",
      listing: { id: "l1", title: "Test", photos: [], latitude: 0, longitude: 0, price: 10 },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ email: "h@test.com", firstName: "Host" });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "CANCELLED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.booking.deleteMany).toHaveBeenCalled();
  });

  it("sends email on APPROVED", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue(baseReservation);
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.booking.create.mockResolvedValue({});
    prismaMock.reservation.update.mockResolvedValue({
      ...baseReservation,
      status: "APPROVED",
      listing: { id: "l1", title: "Test", photos: [], latitude: 0, longitude: 0, price: 10 },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ email: "c@test.com", firstName: "Client" });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "APPROVED" },
    });
    await PATCH(req, makeParams("r1"));
    expect(sendEmail).toHaveBeenCalled();
  });

  it("sends email on DECLINED", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue(baseReservation);
    prismaMock.reservation.update.mockResolvedValue({
      ...baseReservation,
      status: "DECLINED",
      listing: { id: "l1", title: "Test", photos: [], latitude: 0, longitude: 0, price: 10 },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ email: "c@test.com", firstName: "Client" });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "DECLINED" },
    });
    await PATCH(req, makeParams("r1"));
    expect(sendEmail).toHaveBeenCalled();
  });

  it("sends email to host on CANCELLED", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "client1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue({ ...baseReservation, status: "APPROVED" });
    prismaMock.booking.deleteMany.mockResolvedValue({});
    prismaMock.reservation.update.mockResolvedValue({
      ...baseReservation,
      status: "CANCELLED",
      listing: { id: "l1", title: "Test", photos: [], latitude: 0, longitude: 0, price: 10 },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ email: "h@test.com", firstName: "Host" })
      .mockResolvedValueOnce({ firstName: "Client", lastName: "Test" });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "CANCELLED" },
    });
    await PATCH(req, makeParams("r1"));
    expect(sendEmail).toHaveBeenCalled();
  });

  it("does not send email on COMPLETED", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      ...baseReservation,
      status: "APPROVED",
      endDate: new Date("2020-01-05"),
    });
    prismaMock.reservation.update.mockResolvedValue({
      ...baseReservation,
      status: "COMPLETED",
      listing: { id: "l1", title: "Test", photos: [], latitude: 0, longitude: 0, price: 10 },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "COMPLETED" },
    });
    await PATCH(req, makeParams("r1"));
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid state transition (DECLINED to APPROVED)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      ...baseReservation,
      status: "DECLINED",
    });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "APPROVED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 for invalid state transition (COMPLETED to CANCELLED)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "client1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      ...baseReservation,
      status: "COMPLETED",
    });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "CANCELLED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 when completing before end date", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      ...baseReservation,
      status: "APPROVED",
      endDate: new Date("2099-01-01"),
    });
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "COMPLETED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 409 when approving with insufficient space", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "host1" } } as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      ...baseReservation,
      spaceRequested: 5,
      listing: { id: "l1", title: "Test", spaceAvailable: 5, bookings: [] },
    });
    // Existing bookings take up 4 of 5 available space
    prismaMock.booking.findMany.mockResolvedValue([
      { startDate: new Date("2025-01-01"), endDate: new Date("2025-01-10"), reservedSpace: 4 },
    ]);
    const req = createRequest("http://localhost:3000/api/reservations/r1", {
      method: "PATCH",
      body: { status: "APPROVED" },
    });
    const res = await PATCH(req, makeParams("r1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(409);
  });
});
