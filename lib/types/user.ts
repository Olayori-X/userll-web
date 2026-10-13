/** The person logged in, as the API's /auth endpoints return them. */

export type UserRole = "user" | "admin";

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  /** False until they click the link in the verification email. Most actions need it to be true. */
  email_verified: boolean;
  role: UserRole;
  /** True once they have a seller profile (which can exist before identity checks are done). */
  is_seller: boolean;
};