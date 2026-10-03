import bcrypt from "bcrypt";
import { describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "../../../domain/errors/invalid-credentials.error.js";
import { TokenExpiredError } from "../../../domain/errors/token-expired.error.js";
import { JwtAuthGateway } from "../jwt-auth.gateway.js";

async function makeGateway() {
  const passwordHash = await bcrypt.hash("senha123", 4);
  return new JwtAuthGateway([
    { accountId: "usr-001", login: "coordenacao", password: "senha123", passwordHash, name: "Coordenacao", role: "COORDINATION" },
  ]);
}

describe("JwtAuthGateway", () => {
  it("authenticates with valid credentials and returns token plus operator", async () => {
    const gateway = await makeGateway();
    const result = await gateway.authenticate("coordenacao", "senha123");
    expect(result.token.length).toBeGreaterThan(0);
    expect(result.operator.role).toBe("COORDINATION");
  });

  it("throws InvalidCredentialsError for a wrong password", async () => {
    const gateway = await makeGateway();
    await expect(gateway.authenticate("coordenacao", "errada")).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError for an unknown login", async () => {
    const gateway = await makeGateway();
    await expect(gateway.authenticate("ninguem", "senha123")).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("verifies a valid token and returns the operator with role", async () => {
    const gateway = await makeGateway();
    const { token } = await gateway.authenticate("coordenacao", "senha123");
    const operator = await gateway.verify(token);
    expect(operator.accountId).toBe("usr-001");
    expect(operator.role).toBe("COORDINATION");
  });

  it("throws TokenExpiredError for an invalid string", async () => {
    const gateway = await makeGateway();
    await expect(gateway.verify("not-a-token")).rejects.toBeInstanceOf(TokenExpiredError);
  });

  it("throws TokenExpiredError for an expired token", async () => {
    const gateway = await makeGateway();
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-in-production-min-32-chars-0123456789");
    const expired = await new SignJWT({ name: "X", role: "COORDINATION" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("usr-001")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(secret);
    await expect(gateway.verify(expired)).rejects.toBeInstanceOf(TokenExpiredError);
  });
});
