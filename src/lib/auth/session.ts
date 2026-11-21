import { SessionOptions } from "iron-session";

export type UserRole = "owner" | "manager" | "analyst";

export interface SessionUser {
  id: string;
  businessId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface SessionData {
  user?: SessionUser;
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "bizora_dev_default_session_secret_must_be_at_least_32_chars_long_12345",
  cookieName: "bizora_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  },
};
