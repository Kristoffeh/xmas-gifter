import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      // Allow access to login and register pages
      if (req.nextUrl.pathname.startsWith("/login")) {
        return true;
      }
      // Require authentication for other pages
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};

