import { describe, expect, it } from "vitest";
import { bearerTokenFromRequest, createUserResolver } from "./auth.js";

describe("Cognito request authentication", () => {
  it("extracts only a bearer token", () => {
    const request = new Request("https://employee-plus.example/mcp", { headers: { authorization: "Bearer token-123" } });
    expect(bearerTokenFromRequest(request)).toBe("token-123");
    expect(bearerTokenFromRequest(new Request("https://employee-plus.example/mcp"))).toBeUndefined();
  });

  it("keeps the fixture identity only outside production", async () => {
    const resolver = createUserResolver({ environment: "test" });
    const request = new Request("https://employee-plus.example/mcp", { headers: { "x-employee-user-id": "test-user" } });
    await expect(resolver(request)).resolves.toBe("test-user");
  });

  it("rejects production requests without Cognito configuration", () => {
    expect(() => createUserResolver({ environment: "production" })).toThrow("Cognito production configuration is incomplete.");
  });

  it("uses the verified Cognito subject as the tenant identity", async () => {
    const resolver = createUserResolver({
      environment: "production",
      userPoolId: "us-east-2_test",
      clientId: "test-client",
      verifier: { verify: async (token) => ({ sub: token === "valid" ? "cognito-user" : undefined }) },
    });
    const request = new Request("https://employee-plus.example/mcp", { headers: { authorization: "Bearer valid" } });
    await expect(resolver(request)).resolves.toBe("cognito-user");
    const invalid = new Request("https://employee-plus.example/mcp", { headers: { authorization: "Bearer invalid" } });
    await expect(resolver(invalid)).rejects.toThrow("Authentication is required.");
  });
});
