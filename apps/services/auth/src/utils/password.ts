import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  // Detect legacy SHA-256 hashes (64 hex characters)
  if (/^[a-f0-9]{64}$/i.test(hash)) {
    // Legacy insecure hash - reject and force password reset
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
