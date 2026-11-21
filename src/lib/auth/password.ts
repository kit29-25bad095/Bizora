import { hash, verify } from "@node-rs/argon2";

/**
 * OWASP-compliant Argon2id parameter configuration
 * - Memory cost: 64 MB (65,536 KiB)
 * - Time cost: 3 iterations
 * - Parallelism: 4 threads
 * - Algorithm: Argon2id (variant 2)
 */
export const ARGON2_CONFIG = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
} as const;

/**
 * Hash a plain text password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters in length");
  }

  return hash(password, {
    memoryCost: ARGON2_CONFIG.memoryCost,
    timeCost: ARGON2_CONFIG.timeCost,
    parallelism: ARGON2_CONFIG.parallelism,
    outputLen: ARGON2_CONFIG.outputLen,
  });
}

/**
 * Verify a plain text password against an Argon2id hash.
 * Constant-time comparison is handled natively by argon2.
 */
export async function verifyPassword(password: string, hashString: string): Promise<boolean> {
  if (!password || !hashString) {
    return false;
  }

  try {
    return await verify(hashString, password);
  } catch {
    return false;
  }
}
