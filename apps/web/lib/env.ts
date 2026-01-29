/**
 * Environment variable validation
 * Validates all required environment variables at application startup
 * Throws clear errors if any required variables are missing
 */

interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_APP_URL?: string;
}

/**
 * Validates required environment variables
 * @throws {Error} If any required environment variable is missing (only in runtime)
 */
export function validateEnv(): EnvConfig {
  // Skip validation during build time - env vars may not be available
  // Only validate when actually running the application
  const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

  const errors: string[] = [];

  // Required environment variables
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  if (!isBuildTime) {
    // Check for missing required variables
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) {
        errors.push(`${key} is required but not set`);
      }
    }

    // Validate URL format for Supabase URL
    if (requiredVars.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        new URL(requiredVars.NEXT_PUBLIC_SUPABASE_URL);
      } catch {
        errors.push(
          `NEXT_PUBLIC_SUPABASE_URL must be a valid URL (got: ${requiredVars.NEXT_PUBLIC_SUPABASE_URL})`
        );
      }
    }

    // Validate Supabase anon key format (basic check)
    if (
      requiredVars.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      requiredVars.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 20
    ) {
      errors.push(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid (too short)"
      );
    }

    if (errors.length > 0) {
      throw new Error(
        `Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}\n\nPlease check your .env.local file and ensure all required variables are set.`
      );
    }
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: requiredVars.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}

/**
 * Get validated environment configuration
 * Safe to call multiple times - validation only happens once
 */
let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}
