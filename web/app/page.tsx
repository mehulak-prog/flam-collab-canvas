import { redirect } from "next/navigation";

/**
 * Root route. Middleware already requires auth to reach this page
 * (see middleware.ts - "/" is not in isPublicRoute), so anyone who
 * lands here is signed in. Just forward them to the dashboard.
 */
export default function Home() {
  redirect("/dashboard");
}