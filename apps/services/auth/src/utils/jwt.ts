import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development_secret_do_not_use_in_prod",
);

/**
 * Generate token (7 days expiration)
 */
export async function generateToken(
  userId: string,
  email: string,
  fullName?: string,
): Promise<string> {
  return await new SignJWT({
    sub: userId,
    user_metadata: {
      email: email,
      full_name: fullName || null,
    },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (_error) {
    return null;
  }
}
