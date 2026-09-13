import { NextResponse } from "next/server";

/**
 * M3 - Rooms API
 *
 * Standard error response shape used across the project:
 *   { "error": "code", "message": "..." }
 */
export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}
