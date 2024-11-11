import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { env } from "./env";

const isProtectedRoute = createRouteMatcher([
  "/api/appointments",
  "/api/barbers",
  "/api/services",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();
  if (!userId && isProtectedRoute(req))
    return redirectToSignIn({ returnBackUrl: req.url });

  if (
    userId &&
    !sessionClaims?.email &&
    !String(sessionClaims?.email).includes(env.OWNER_EMAIL) &&
    req.nextUrl.pathname.startsWith("/dashboard")
  )
    await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
