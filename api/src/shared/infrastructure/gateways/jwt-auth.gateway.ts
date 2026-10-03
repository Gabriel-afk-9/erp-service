import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { InvalidCredentialsError } from "../../domain/errors/invalid-credentials.error.js";
import { TokenExpiredError } from "../../domain/errors/token-expired.error.js";
import type {
  AuthenticatedOperator,
  AuthGateway,
} from "../../domain/gateways/auth.gateway.js";
import type { usersFixture } from "./fixtures/users.fixture.js";

type FixtureUser = (typeof usersFixture)[number] & { passwordHash?: string };

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET ?? "dev-secret-change-in-production-min-32-chars-0123456789";
  return new TextEncoder().encode(raw);
}

export class JwtAuthGateway implements AuthGateway {
  constructor(private readonly users: FixtureUser[]) {}

  async authenticate(login: string, password: string): Promise<{ token: string; operator: AuthenticatedOperator }> {
    const user = this.users.find((u) => u.login === login);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    const hash = user.passwordHash ?? "";
    const ok = hash.length > 0 ? await bcrypt.compare(password, hash) : password === (user as unknown as { password: string }).password;
    if (!ok) {
      throw new InvalidCredentialsError();
    }
    const token = await new SignJWT({ name: user.name, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.accountId)
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(getSecret());
    return { token, operator: { accountId: user.accountId, name: user.name, role: user.role } };
  }

  async verify(token: string): Promise<AuthenticatedOperator> {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      const sub = typeof payload.sub === "string" ? payload.sub : null;
      const name = typeof payload["name"] === "string" ? (payload["name"] as string) : "";
      const role = payload["role"] as AuthenticatedOperator["role"];
      if (!sub || !name || !role) {
        throw new TokenExpiredError();
      }
      return { accountId: sub, name, role };
    } catch {
      throw new TokenExpiredError();
    }
  }
}
