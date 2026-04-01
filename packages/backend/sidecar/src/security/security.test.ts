import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { WorkspaceGuard } from "./workspace-guard";
import { RateLimiter } from "./rate-limiter";
import {
  validatePathParam,
  validateContentParam,
  validateFilenameParam,
} from "./validation";

describe("WorkspaceGuard", () => {
  const basePath = "/home/user/workspace";
  let guard: WorkspaceGuard;

  beforeEach(() => {
    guard = new WorkspaceGuard(basePath);
  });

  describe("validatePath", () => {
    it("should allow paths within workspace", () => {
      const result = guard.validatePath("/home/user/workspace/project");
      expect(result).toBeTruthy();
    });

    it("should allow relative paths within workspace", () => {
      const result = guard.validatePath("project/src/file.ts");
      expect(result).toBeTruthy();
    });

    it("should block path traversal attempts", () => {
      const result = guard.validatePath("../../../etc/passwd");
      expect(result).toBeNull();
    });

    it("should block null path", () => {
      const result = guard.validatePath(null as any);
      expect(result).toBeNull();
    });

    it("should block empty path", () => {
      const result = guard.validatePath("");
      expect(result).toBeNull();
    });

    it("should block paths starting with /etc", () => {
      const result = guard.validatePath("/etc/passwd");
      expect(result).toBeNull();
    });
  });

  describe("validateFilename", () => {
    it("should allow valid filenames", () => {
      expect(guard.validateFilename("file.ts")).toBe(true);
      expect(guard.validateFilename("my-file.js")).toBe(true);
      expect(guard.validateFilename("file_name.css")).toBe(true);
    });

    it("should block path traversal in filename", () => {
      expect(guard.validateFilename("../file.ts")).toBe(false);
      expect(guard.validateFilename("file/../test.ts")).toBe(false);
    });

    it("should block invalid characters", () => {
      expect(guard.validateFilename("file<>.ts")).toBe(false);
      expect(guard.validateFilename("file:test.ts")).toBe(false);
      expect(guard.validateFilename("file|name.ts")).toBe(false);
    });

    it("should block empty filename", () => {
      expect(guard.validateFilename("")).toBe(false);
    });
  });

  describe("validateContentSize", () => {
    it("should allow content within limit", () => {
      const content = "a".repeat(1000);
      expect(guard.validateContentSize(content)).toBe(true);
    });

    it("should block oversized content", () => {
      const guardWithLimit = new WorkspaceGuard(basePath, 100);
      const content = "a".repeat(200);
      expect(guardWithLimit.validateContentSize(content)).toBe(false);
    });
  });

  describe("isAllowedExtension", () => {
    it("should allow source code files", () => {
      expect(guard.isAllowedExtension("file.ts")).toBe(true);
      expect(guard.isAllowedExtension("file.js")).toBe(true);
      expect(guard.isAllowedExtension("file.css")).toBe(true);
    });

    it("should block executables", () => {
      expect(guard.isAllowedExtension("program.exe")).toBe(false);
      expect(guard.isAllowedExtension("lib.so")).toBe(false);
      expect(guard.isAllowedExtension("lib.dylib")).toBe(false);
    });

    it("should block key files", () => {
      expect(guard.isAllowedExtension("private.key")).toBe(false);
      expect(guard.isAllowedExtension("cert.pem")).toBe(false);
    });

    it("should block env files", () => {
      expect(guard.isAllowedExtension(".env")).toBe(false);
      expect(guard.isAllowedExtension(".env.local")).toBe(false);
    });
  });
});

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(5, 1000); // 5 requests per second
  });

  afterEach(() => {
    limiter.stop();
  });

  it("should allow requests within limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.checkLimit("user1");
      expect(result.allowed).toBe(true);
    }
  });

  it("should block requests exceeding limit", () => {
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit("user1");
    }

    const result = limiter.checkLimit("user1");
    expect(result.allowed).toBe(false);
  });

  it("should track remaining requests correctly", () => {
    limiter.checkLimit("user1");
    limiter.checkLimit("user1");

    const result = limiter.checkLimit("user1");
    expect(result.remaining).toBe(2);
  });

  it("should reset after window expires", async () => {
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit("user1");
    }

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const result = limiter.checkLimit("user1");
    expect(result.allowed).toBe(true);
  });

  it("should track different users separately", () => {
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit("user1");
    }

    // user2 should still be allowed
    const result = limiter.checkLimit("user2");
    expect(result.allowed).toBe(true);
  });
});

describe("Input Validation", () => {
  describe("validatePathParam", () => {
    it("should validate valid paths", () => {
      expect(validatePathParam("/valid/path").valid).toBe(true);
      expect(validatePathParam("file.ts").valid).toBe(true);
    });

    it("should reject null/undefined", () => {
      expect(validatePathParam(null).valid).toBe(false);
      expect(validatePathParam(undefined).valid).toBe(false);
    });

    it("should reject empty strings", () => {
      expect(validatePathParam("").valid).toBe(false);
    });

    it("should reject paths with null bytes", () => {
      expect(validatePathParam("path\x00file").valid).toBe(false);
    });

    it("should reject extremely long paths", () => {
      const longPath = "a".repeat(5000);
      expect(validatePathParam(longPath).valid).toBe(false);
    });
  });

  describe("validateContentParam", () => {
    it("should validate valid content", () => {
      expect(validateContentParam("Hello World").valid).toBe(true);
    });

    it("should reject null/undefined", () => {
      expect(validateContentParam(null).valid).toBe(false);
      expect(validateContentParam(undefined).valid).toBe(false);
    });

    it("should reject oversized content", () => {
      const bigContent = "a".repeat(100);
      expect(validateContentParam(bigContent, 50).valid).toBe(false);
    });
  });

  describe("validateFilenameParam", () => {
    it("should validate valid filenames", () => {
      expect(validateFilenameParam("file.ts").valid).toBe(true);
      expect(validateFilenameParam("my-file.js").valid).toBe(true);
    });

    it("should reject path traversal", () => {
      expect(validateFilenameParam("../file.ts").valid).toBe(false);
    });

    it("should reject invalid characters", () => {
      expect(validateFilenameParam("file<>.ts").valid).toBe(false);
    });
  });
});
