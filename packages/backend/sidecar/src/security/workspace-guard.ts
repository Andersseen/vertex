import { resolve, normalize, sep } from "node:path";

/**
 * Security guard for workspace path validation
 * Prevents path traversal attacks by validating all paths against allowed base directory
 */
export class WorkspaceGuard {
  private allowedBase: string;
  private readonly rootBoundary: string;
  private readonly maxFileSize: number;

  /**
   * @param basePath - Initial workspace root.
   * @param maxFileSizeBytes - Max file size for read/write operations.
   * @param rootBoundary - Outer boundary the workspace may never escape, even
   *   when the client changes it via `setAllowedBase`. Defaults to `basePath`,
   *   which means the workspace can only be narrowed to subdirectories unless a
   *   wider boundary (e.g. the user's home directory) is supplied explicitly.
   */
  constructor(
    basePath: string,
    maxFileSizeBytes: number = 10 * 1024 * 1024,
    rootBoundary?: string,
  ) {
    this.allowedBase = normalize(resolve(basePath));
    this.rootBoundary = rootBoundary
      ? normalize(resolve(rootBoundary))
      : this.allowedBase;
    this.maxFileSize = maxFileSizeBytes;
  }

  /**
   * True if `child` is `parent` itself or lives inside it. A trailing separator
   * on `parent` prevents partial matches (e.g. `/workspace` vs `/workspace2`).
   */
  private isWithin(child: string, parent: string): boolean {
    const parentWithSep = parent.endsWith(sep) ? parent : parent + sep;
    return child === parent || child.startsWith(parentWithSep);
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

    const resolved = normalize(resolve(this.allowedBase, inputPath));
    return this.isWithin(resolved, this.allowedBase) ? resolved : null;
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
   * Updates the allowed base path (e.g., when the user selects a new workspace).
   * The new path must stay within `rootBoundary`, so a compromised or
   * overreaching caller cannot repoint the workspace at arbitrary disk
   * locations (`/`, `/etc`, another user's home, …).
   * @param newBasePath - The new base path to set.
   * @returns The resolved absolute path if accepted, or null if it escapes the
   *   configured root boundary.
   */
  setAllowedBase(newBasePath: string): string | null {
    if (!newBasePath || typeof newBasePath !== "string") {
      return null;
    }
    const resolved = normalize(resolve(newBasePath));
    if (!this.isWithin(resolved, this.rootBoundary)) {
      return null;
    }
    this.allowedBase = resolved;
    return resolved;
  }

  /**
   * Gets the outer boundary the workspace may never escape.
   */
  getRootBoundary(): string {
    return this.rootBoundary;
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
