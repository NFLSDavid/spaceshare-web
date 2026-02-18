import { NextRequest, NextResponse } from "next/server";
import { withAuth, ApiError } from "@/lib/api-utils";
import { uploadImage } from "@/lib/cloudinary";

export const POST = withAuth(async (req: NextRequest) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const folder = (formData.get("folder") as string) || "spaceshare";

  if (!file) {
    throw new ApiError(400, "No file provided");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

  const url = await uploadImage(base64, folder);

  return NextResponse.json({ url });
});
