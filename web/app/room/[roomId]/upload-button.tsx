"use client";

import { useRef, useState } from "react";
import { AssetRecordType, createShapeId, useEditor } from "tldraw";

/**
 * M10 addition - Image upload into canvas
 *
 * Renders a small floating button. On click, opens a file picker, uploads
 * the chosen image to the M8 Assets API (/api/rooms/[roomId]/assets), which
 * forwards it to M7 for processing/storage, then inserts the returned image
 * as a tldraw asset + shape, centered in the current viewport.
 */
export function UploadButton({ roomId }: { roomId: string }) {
    const editor = useEditor();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ""; // reset so picking the same file again still fires onChange
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`/api/rooms/${roomId}/assets`, {
                method: "POST",
                body: formData,
            });

            const body = await res.json();

            if (!res.ok) {
                setError(body?.message ?? "Upload failed");
                return;
            }

            const asset = body as {
                originalUrl: string;
                width: number;
                height: number;
            };

            insertImage(asset);
        } catch {
            setError("Could not reach the server");
        } finally {
            setUploading(false);
        }
    }

    function insertImage(asset: { originalUrl: string; width: number; height: number }) {
        const assetId = AssetRecordType.createId();
        const shapeId = createShapeId();

        editor.createAssets([
            {
                id: assetId,
                type: "image",
                typeName: "asset",
                props: {
                    name: "uploaded-image",
                    src: asset.originalUrl,
                    w: asset.width,
                    h: asset.height,
                    mimeType: "image/jpeg",
                    isAnimated: false,
                },
                meta: {},
            },
        ]);

        // Center the image in the current viewport rather than a fixed page position
        const bounds = editor.getViewportPageBounds();
        const x = bounds.center.x - asset.width / 2;
        const y = bounds.center.y - asset.height / 2;

        editor.createShape({
            id: shapeId,
            type: "image",
            x,
            y,
            props: {
                assetId,
                w: asset.width,
                h: asset.height,
            },
        });
    }

    return (
        <div style={{ position: "absolute", top: 60, left: 12, zIndex: 999 }}>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
            />
            <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                style={{
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: uploading ? "default" : "pointer",
                    fontFamily: "sans-serif",
                    fontSize: 14,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
            >
                {uploading ? "Uploading..." : "Upload Image"}
            </button>
            {error && (
                <div
                    style={{
                        marginTop: 6,
                        padding: "6px 10px",
                        background: "#fee",
                        border: "1px solid #f99",
                        borderRadius: 4,
                        fontFamily: "sans-serif",
                        fontSize: 12,
                        color: "#900",
                        maxWidth: 220,
                    }}
                >
                    {error}
                </div>
            )}
        </div>
    );
}