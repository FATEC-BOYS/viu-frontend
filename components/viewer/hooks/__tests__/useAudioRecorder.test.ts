import { describe, it, expect } from "vitest";
import { formatElapsed } from "../useAudioRecorder";

describe("formatElapsed", () => {
  it("formats 0ms as 00:00", () => {
    expect(formatElapsed(0)).toBe("00:00");
  });

  it("formats seconds correctly", () => {
    expect(formatElapsed(5000)).toBe("00:05");
    expect(formatElapsed(30000)).toBe("00:30");
  });

  it("formats minutes and seconds", () => {
    expect(formatElapsed(65000)).toBe("01:05");
    expect(formatElapsed(600000)).toBe("10:00");
  });

  it("pads single-digit values with zero", () => {
    expect(formatElapsed(1000)).toBe("00:01");
    expect(formatElapsed(61000)).toBe("01:01");
  });

  it("handles large values", () => {
    expect(formatElapsed(3600000)).toBe("60:00"); // 1 hour
  });
});
