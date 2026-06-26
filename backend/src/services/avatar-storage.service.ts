import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../config/logger.js";

type SupabaseStorageConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
};

let supabaseClient: SupabaseClient | null = null;

const getStorageConfig = (): SupabaseStorageConfig => {
  const url = (process.env.SUPABASE_URL || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || "").trim();

  if (!url) {
    throw new Error("Supabase is not configured: SUPABASE_URL is missing.");
  }

  if (!serviceRoleKey) {
    throw new Error("Supabase is not configured: SUPABASE_SERVICE_ROLE_KEY is missing.");
  }

  if (!bucket) {
    throw new Error("Supabase is not configured: SUPABASE_STORAGE_BUCKET is missing.");
  }

  return { url, serviceRoleKey, bucket };
};

const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) return supabaseClient;

  const { url, serviceRoleKey } = getStorageConfig();
  supabaseClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
};

/**
 * Called once at server startup to verify Supabase environment variables are
 * present and the storage bucket is reachable. Throws on any misconfiguration
 * so the process exits early with a clear message instead of failing silently
 * on the first avatar upload attempt.
 */
export const validateSupabaseConfig = async (): Promise<void> => {
  const config = getStorageConfig(); // throws if any env var is missing
  const client = getSupabaseClient();

  const { data, error } = await client.storage.getBucket(config.bucket);
  if (error || !data) {
    throw new Error(
      `Supabase storage validation failed: bucket "${config.bucket}" is not accessible — ${error?.message ?? "no data returned"}. ` +
      "Verify SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET."
    );
  }

  logger.info(`Supabase storage validated: bucket "${config.bucket}" is accessible.`);
};

/**
 * Extracts the Supabase storage object path from a public URL produced by
 * getPublicUrl(). Returns null if the URL does not match our bucket.
 *
 * Public URL structure:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
const extractStoragePath = (publicUrl: string, bucket: string): string | null => {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
};

export const uploadAvatarToSupabase = async (input: {
  userId: string;
  buffer: Buffer;
  mimeType: "image/png" | "image/jpeg";
  /** Public URL of the previous avatar stored in Supabase (if any). */
  oldAvatarUrl?: string | null;
}) => {
  const { userId, buffer, mimeType, oldAvatarUrl } = input;
  const { bucket } = getStorageConfig();
  const client = getSupabaseClient();

  const ext = mimeType === "image/png" ? "png" : "jpg";
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const filePath = `avatars/${userId}/${Date.now()}-${randomSuffix}.${ext}`;

  const uploadResult = await client.storage.from(bucket).upload(filePath, buffer, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: true,
  });

  if (uploadResult.error) {
    throw new Error(`Supabase avatar upload failed: ${uploadResult.error.message}`);
  }

  const publicResult = client.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = publicResult.data.publicUrl;

  if (!publicUrl) {
    throw new Error("Supabase avatar upload failed: public URL could not be generated.");
  }

  // Best-effort deletion of the previous avatar file — never blocks the upload.
  if (oldAvatarUrl) {
    const oldPath = extractStoragePath(oldAvatarUrl, bucket);
    if (oldPath) {
      client.storage.from(bucket).remove([oldPath]).then(({ error: removeError }) => {
        if (removeError) {
          logger.warn(`Failed to delete old avatar from Supabase: ${removeError.message}`, { oldPath });
        } else {
          logger.info(`Deleted old avatar from Supabase storage: ${oldPath}`);
        }
      });
    }
  }

  return publicUrl;
};
