import { resolve, normalize, sep } from "node:path";

/**
 * Security guard for workspace path validation
 * Prevents path traversal attacks by validating all paths against allowed base directory
 */
export class WorkspaceGuard {
  private readonly allowedBase: string;
  private readonly maxFileSize: number;

  constructor(basePath: string, maxFileSizeBytes: number = 10 * 1024 * 1024) {
    this.allowedBase = normalize(resolve(basePath));
    this.maxFileSize = maxFileSizeBytes;
  }

  /**
   * Validates and resolves a path, ensuring it stays within allowed workspace
   * @param inputPath - The user-provided path
   * @returns Resolved absolute path if valid, null if invalid
   */
  validatePath(inputPath: string): string | null {
    if (!inputPath || typeof inputPath !== "string") {
      return null;
    }

    // Normalize and resolve the path
    const resolved = normalize(resolve(this.allowedBase, inputPath));

    // Ensure the resolved path starts with allowed base
    // Add trailing separator to prevent partial matches (e.g., /workspace vs /workspace2)
    const baseWithSep = this.allowedBase.endsWith(sep)
      ? this.allowedBase
      : this.allowedBase + sep;

    if (!resolved.startsWith(baseWithSep) && resolved !== this.allowedBase) {
      return null;
    }

    return resolved;
  }

  /**
   * Validates a filename for write operations
   * @param filename - The filename to validate
   * @returns true if valid, false otherwise
   */
  validateFilename(filename: string): boolean {
    if (!filename || typeof filename !== "string") {
      return false;
    }

    // Check for path traversal attempts in filename
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return false;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(filename)) {
      return false;
    }

    // Check length
    if (filename.length === 0 || filename.length > 255) {
      return false;
    }

    return true;
  }

  /**
   * Validates file content size
   * @param content - The content to validate
   * @returns true if within limits, false otherwise
   */
  validateContentSize(content: string): boolean {
    if (typeof content !== "string") {
      return false;
    }

    // Approximate byte size (UTF-8)
    const byteSize = Buffer.byteLength(content, "utf-8");
    return byteSize <= this.maxFileSize;
  }

  /**
   * Gets the allowed base path
   */
  getAllowedBase(): string {
    return this.allowedBase;
  }

  /**
   * Updates the allowed base path (e.g., when user selects a new workspace)
   * @param newBasePath - The new base path to set
   */
  setAllowedBase(newBasePath: string): void {
    (this as any).allowedBase = normalize(resolve(newBasePath));
  }

  /**
   * Checks if a file extension is allowed for reading
   * @param filename - The filename to check
   * @returns true if allowed, false otherwise
   */
  isAllowedExtension(filename: string): boolean {
    const blockedExtensions = [
      ".exe",
      ".dll",
      ".so",
      ".dylib",
      ".bin",
      ".key",
      ".pem",
      ".p12",
      ".pfx",
      ".crt",
    ];

    const blockedFilenames = [
      ".env",
      ".env.local",
      ".env.production",
      ".env.development",
      ".env.test",
    ];

    const lowerFilename = filename.toLowerCase();

    // Check for blocked exact filenames (for dotfiles)
    if (blockedFilenames.includes(lowerFilename)) {
      return false;
    }

    // Check extension
    const ext = lowerFilename.slice(lowerFilename.lastIndexOf("."));
    return !blockedExtensions.includes(ext);
  }
}
