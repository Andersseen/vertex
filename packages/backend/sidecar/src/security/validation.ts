/**
 * Input validation utilities for API endpoints
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file path parameter
 */
export function validatePathParam(
  path: string | null | undefined,
): ValidationResult {
  if (path === null || path === undefined) {
    return { valid: false, error: "Path is required" };
  }

  if (typeof path !== "string") {
    return { valid: false, error: "Path must be a string" };
  }

  if (path.length === 0) {
    return { valid: false, error: "Path cannot be empty" };
  }

  if (path.length > 4096) {
    return {
      valid: false,
      error: "Path exceeds maximum length of 4096 characters",
    };
  }

  // Check for null bytes
  if (path.includes("\x00")) {
    return { valid: false, error: "Path contains invalid characters" };
  }

  return { valid: true };
}

/**
 * Validates file content for write operations
 */
export function validateContentParam(
  content: unknown,
  maxSize: number = 10 * 1024 * 1024,
): ValidationResult {
  if (content === null || content === undefined) {
    return { valid: false, error: "Content is required" };
  }

  if (typeof content !== "string") {
    return { valid: false, error: "Content must be a string" };
  }

  const byteSize = Buffer.byteLength(content, "utf-8");
  if (byteSize > maxSize) {
    return {
      valid: false,
      error: `Content exceeds maximum size of ${formatBytes(maxSize)}`,
    };
  }

  return { valid: true };
}

/**
 * Validates filename for new file creation
 */
export function validateFilenameParam(
  filename: string | null | undefined,
): ValidationResult {
  if (!filename || typeof filename !== "string") {
    return { valid: false, error: "Filename is required" };
  }

  if (filename.length === 0) {
    return { valid: false, error: "Filename cannot be empty" };
  }

  if (filename.length > 255) {
    return { valid: false, error: "Filename exceeds 255 characters" };
  }

  // Check for path traversal
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return { valid: false, error: "Filename contains invalid path characters" };
  }

  // Check for invalid filename characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(filename)) {
    return { valid: false, error: "Filename contains invalid characters" };
  }

  return { valid: true };
}

/**
 * Validates pagination/limit parameters
 */
export function validateLimitParam(
  limit: string | number | null | undefined,
  maxLimit: number = 1000,
  defaultLimit: number = 100,
): { valid: boolean; value: number; error?: string } {
  if (limit === null || limit === undefined) {
    return { valid: true, value: defaultLimit };
  }

  const numLimit = typeof limit === "string" ? parseInt(limit, 10) : limit;

  if (isNaN(numLimit)) {
    return {
      valid: false,
      value: defaultLimit,
      error: "Limit must be a number",
    };
  }

  if (numLimit < 1) {
    return {
      valid: false,
      value: defaultLimit,
      error: "Limit must be at least 1",
    };
  }

  if (numLimit > maxLimit) {
    return {
      valid: false,
      value: maxLimit,
      error: `Limit cannot exceed ${maxLimit}`,
    };
  }

  return { valid: true, value: numLimit };
}

/**
 * Formats bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
