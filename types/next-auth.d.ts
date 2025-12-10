import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      onboardingCompleted: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    onboardingCompleted: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    onboardingCompleted: boolean;
  }
}

