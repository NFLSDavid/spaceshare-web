import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { reservationStatusEmail } from "@/lib/email-templates";
import { format } from "date-fns";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, rated, paymentCompleted } = body;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // Only host can approve/decline, only client can cancel/pay
    const isHost = reservation.hostId === session.user.id;
    const isClient = reservation.clientId === session.user.id;

    if (!isHost && !isClient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {};

    if (status) {
      if (status === "APPROVED" && isHost) {
        updateData.status = "APPROVED";
        // Create booking for the listing
        await prisma.booking.create({
          data: {
            listingId: reservation.listingId,
            startDate: reservation.startDate,
            endDate: reservation.endDate,
            reservedSpace: reservation.spaceRequested,
          },
        });
      } else if (status === "DECLINED" && isHost) {
        updateData.status = "DECLINED";
      } else if (status === "CANCELLED" && isClient) {
        updateData.status = "CANCELLED";
        // Remove the booking
        await prisma.booking.deleteMany({
          where: {
            listingId: reservation.listingId,
            startDate: reservation.startDate,
            endDate: reservation.endDate,
            reservedSpace: reservation.spaceRequested,
          },
        });
      } else if (status === "COMPLETED" && isHost) {
        updateData.status = "COMPLETED";
      }
    }

    if (rated !== undefined) updateData.rated = rated;
    if (paymentCompleted !== undefined) updateData.paymentCompleted = paymentCompleted;

    const updated = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        listing: {
          select: { id: true, title: true, photos: true, latitude: true, longitude: true, price: true },
        },
        host: { select: { id: true, firstName: true, lastName: true, photoUrl: true, email: true } },
        client: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    // Send email notification on status change (fire-and-forget)
    if (status === "APPROVED" || status === "DECLINED") {
      const client = await prisma.user.findUnique({
        where: { id: reservation.clientId },
        select: { email: true, firstName: true },
      });
      if (client) {
        const emailContent = reservationStatusEmail(
          client.firstName,
          updated.listing.title,
          status,
          {
            start: format(new Date(reservation.startDate), "MMM d, yyyy"),
            end: format(new Date(reservation.endDate), "MMM d, yyyy"),
          }
        );
        sendEmail(client.email, emailContent.subject, emailContent.html);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Reservation PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
