/**
 * Everything the app can ask the API about signing in. Components call these, never api.get/post directly.
 *
 * Field names are the API's (snake_case), so a form's values can be passed straight through.
 * Validation problems come back as an ApiError (status 422) with per-field messages.
 */

import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types/user";

type Message = { message: string };

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ResetPasswordInput = {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
};

/** Creates the account and signs them in. Their email is not verified yet. The token never reaches the browser. */
export function register(input: RegisterInput) {
  return api.post<{ user: User }>("/auth/register", input);
}

/** Wrong password is a 401 here, and means "try again", not "your session ended", hence quiet401. */
export function login(input: LoginInput) {
  return api.post<{ user: User }>("/auth/login", input, { quiet401: true });
}

/** Ends the session. The proxy clears the cookie even if the API is unreachable. */
export function logout() {
  return api.post<Message>("/auth/logout", undefined, { quiet401: true });
}

/** Who is logged in right now? Null when nobody is. Other failures (offline, server down) still throw. */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Laravel wraps a lone resource as { data: ... }; we unwrap it here so nothing else has to know.
    const { data } = await api.get<{ data: User }>("/auth/me", { quiet401: true });

    return data;
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) return null;

    throw error;
  }
}

/** Sends the verification email again. Needs a logged-in user. */
export function resendVerificationEmail() {
  return api.post<Message>("/auth/email/resend");
}

/** Always answers the same way, whether or not the email has an account. */
export function forgotPassword(email: string) {
  return api.post<Message>("/auth/forgot-password", { email });
}

/** Uses the token and email from the link in the reset email. Signs them out everywhere. */
export function resetPassword(input: ResetPasswordInput) {
  return api.post<Message>("/auth/reset-password", input);
}