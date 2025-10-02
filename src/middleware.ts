import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { env } from "./env";

const isProtectedRoute = createRouteMatcher([
  // "/api/appointments",
  // "/api/barbers",
  // "/api/services",
  "/dashboard",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();
  
  // Redirect to sign-in if accessing protected route without authentication
  if (!userId && isProtectedRoute(req)) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // For dashboard routes, verify user is the owner
  if (userId && req.nextUrl.pathname.startsWith("/dashboard")) {
    const userEmail = sessionClaims?.email as string | undefined;
    
    // If user email doesn't match owner email, deny access
    if (!userEmail || userEmail !== env.OWNER_EMAIL) {
      await auth.protect();
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
