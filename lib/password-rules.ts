/**
 * The password rules, the same ones the API enforces: at least 8 characters, upper and lower case
 * letters, and a number. Shared by the sign-up and reset forms, so a change is made in one place.
 * (Letters and digits are Unicode-aware, like Laravel's own check.)
 */

export const PASSWORD_RULE = "Use at least 8 characters, with upper and lower case letters and a number.";

export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /\p{Ll}/u.test(value) && /\p{Lu}/u.test(value) && /\p{N}/u.test(value);
}