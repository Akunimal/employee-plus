import { describe, expect, it } from "vitest";
import { EmployeeError, parseOrThrow } from "./index.js";
import { z } from "zod";

describe("Employee+ runtime contracts", () => {
  it("parses valid inputs", () => expect(parseOrThrow(z.object({ value: z.string() }), { value: "ok" })).toEqual({ value: "ok" }));
  it("turns invalid inputs into safe domain errors", () => {
    expect(() => parseOrThrow(z.object({ value: z.string() }), { value: 3 })).toThrowError(EmployeeError);
  });
});
