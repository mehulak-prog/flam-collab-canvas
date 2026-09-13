"use client";

import { useEffect, useRef, useState } from "react";

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DEFAULT_SWATCH = "#f9fafb";
const FONT =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function BackgroundColorPicker({
    value,
    onChange,
}: {
    value: string | null;
    onChange: (hex: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value ?? "");
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    function commit(next: string) {
        setDraft(next);
        if (next === "") {
            setError(null);
            onChange(null);
            return;
        }
        if (HEX_PATTERN.test(next)) {
            setError(null);
            onChange(next);
        } else {
            setError("Invalid hex code");
        }
    }

    return (
        <div
            ref={containerRef}
            style={{ position: "absolute", top: 320, right: 16, zIndex: 999, fontFamily: FONT }}
        >
            <button
                onClick={() => setOpen((o) => !o)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #e0e0e0",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#333",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                }}
            >
                {/* paint-bucket icon so the button's purpose is clear without opening it */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 11l-8-8-8.5 8.5a2.12 2.12 0 0 0 0 3L8 20l11-9z" />
                    <path d="M5 2l5 5" />
                    <path d="M2 13h15" />
                    <circle cx="19.5" cy="17.5" r="2.5" />
                </svg>
                Background
                <span
                    style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: "1px solid rgba(0,0,0,0.15)",
                        background: value ?? DEFAULT_SWATCH,
                        marginLeft: 2,
                    }}
                />
            </button>

            {open && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: 8,
                        background: "#fff",
                        border: "1px solid #e5e5e5",
                        borderRadius: 10,
                        padding: 10,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        width: 168,
                    }}
                >
                    <div style={{ fontSize: 12, color: "#777" }}>Canvas background</div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <input
                            type="color"
                            value={
                                HEX_PATTERN.test(draft) && draft.length === 7
                                    ? draft
                                    : DEFAULT_SWATCH
                            }
                            onChange={(e) => commit(e.target.value)}
                            style={{
                                width: 30,
                                height: 30,
                                padding: 0,
                                border: "1px solid #ddd",
                                borderRadius: 6,
                                cursor: "pointer",
                            }}
                        />
                        <input
                            type="text"
                            value={draft}
                            onChange={(e) => commit(e.target.value)}
                            placeholder="#f9fafb"
                            style={{
                                flex: 1,
                                minWidth: 0,
                                fontSize: 13,
                                padding: "4px 6px",
                                border: "1px solid #ddd",
                                borderRadius: 6,
                                fontFamily: "monospace",
                            }}
                        />
                    </div>
                    {error && (
                        <div style={{ fontSize: 11, color: "#991b1b" }}>{error}</div>
                    )}
                    {value && (
                        <button
                            onClick={() => {
                                setDraft("");
                                setError(null);
                                onChange(null);
                            }}
                            style={{
                                fontSize: 12,
                                color: "#555",
                                background: "none",
                                border: "none",
                                textAlign: "left",
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            Reset to default
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}