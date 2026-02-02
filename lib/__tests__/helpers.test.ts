import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  capitalize,
  truncate,
  formatFileSize,
  getInitials,
  isValidEmail,
  debounce,
  buildShareUrl,
} from "../helpers";

describe("formatDate", () => {
  it("formats a Date object to pt-BR locale string", () => {
    const result = formatDate(new Date("2024-06-15T12:00:00Z"));
    expect(result).toMatch(/15/);
    expect(result).toMatch(/06|jun/i);
  });

  it("formats a date string", () => {
    const result = formatDate("2024-01-01T00:00:00Z");
    expect(result).toBeTruthy();
  });
});

describe("formatDateTime", () => {
  it("includes time component", () => {
    const result = formatDateTime("2024-06-15T14:30:00Z");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(8);
  });
});

describe("capitalize", () => {
  it("capitalizes first letter and lowercases the rest", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("WORLD")).toBe("World");
    expect(capitalize("a")).toBe("A");
  });
});

describe("truncate", () => {
  it("returns the text as-is if shorter than limit", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("truncates and adds ellipsis when text exceeds limit", () => {
    expect(truncate("this is a long sentence", 10)).toBe("this is a ...");
  });

  it("uses default length of 50", () => {
    const long = "a".repeat(60);
    expect(truncate(long)).toBe("a".repeat(50) + "...");
  });
});

describe("formatFileSize", () => {
  it("formats 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
  });

  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 Bytes");
  });

  it("formats KB", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("formats MB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1 MB");
  });

  it("formats GB", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("formats with decimals", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });
});

describe("getInitials", () => {
  it("returns first two initials uppercase", () => {
    expect(getInitials("João Silva")).toBe("JS");
  });

  it("handles single name", () => {
    expect(getInitials("Maria")).toBe("M");
  });

  it("limits to 2 characters for long names", () => {
    expect(getInitials("Ana Beatriz Costa")).toBe("AB");
  });
});

describe("isValidEmail", () => {
  it("returns true for valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("name@domain.co")).toBe(true);
  });

  it("returns false for invalid email", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @domain.com")).toBe(false);
  });
});

describe("debounce", () => {
  it("delays function execution", async () => {
    let count = 0;
    const fn = debounce(() => {
      count++;
    }, 50);

    fn();
    fn();
    fn();

    expect(count).toBe(0);
    await new Promise((r) => setTimeout(r, 100));
    expect(count).toBe(1);
  });
});

describe("buildShareUrl", () => {
  it("returns empty string for null token", () => {
    expect(buildShareUrl(null)).toBe("");
  });

  it("builds URL with token", () => {
    const url = buildShareUrl("abc123");
    expect(url).toContain("/shared/abc123");
  });
});
