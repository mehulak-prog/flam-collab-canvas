import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { getRoomMember, saveAsset } from "@/lib/rooms";

function errorResponse(status: number, code: string, message: string) {
    return NextResponse.json({ error: code, message }, { status });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const { userId } = await auth();
    if (!userId) {
        return errorResponse(401, "unauthorized", "You must be signed in");
    }

    const { roomId } = await params;

    const member = await getRoomMember(roomId, userId);
    if (!member) {
        return errorResponse(403, "forbidden", "You are not a member of this room");
    }

    const imageServiceUrl = process.env.IMAGE_SERVICE_URL;
    if (!imageServiceUrl) {
        return errorResponse(500, "internal_error", "Image service is not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
        return errorResponse(400, "invalid_file", "No file provided");
    }

    // Forward the upload to the M7 Python image service
    const forwardForm = new FormData();
    const fileName = file instanceof File ? file.name : "upload";
    forwardForm.append("file", file, fileName);

    let m7Response: Response;
    try {
        m7Response = await fetch(`${imageServiceUrl}/process-image`, {
            method: "POST",
            body: forwardForm,
        });
    } catch {
        return errorResponse(
            500,
            "internal_error",
            "Failed to reach the image processing service"
        );
    }

    if (!m7Response.ok) {
        // Pass through M7's error shape and status code as-is
        let body: unknown;
        try {
            body = await m7Response.json();
        } catch {
            body = { error: "internal_error", message: "Image service returned an unreadable error" };
        }
        return NextResponse.json(body, { status: m7Response.status });
    }

    const result = (await m7Response.json()) as {
        originalUrl: string;
        thumbUrl: string;
        width: number;
        height: number;
        sizeBytes: number;
    };

    const id = randomUUID();

    try {
        const asset = await saveAsset({
            id,
            roomId,
            originalUrl: result.originalUrl,
            thumbUrl: result.thumbUrl,
            width: result.width,
            height: result.height,
            sizeBytes: result.sizeBytes,
        });

        return NextResponse.json(asset, { status: 200 });
    } catch {
        return errorResponse(500, "internal_error", "Failed to save asset");
    }
}