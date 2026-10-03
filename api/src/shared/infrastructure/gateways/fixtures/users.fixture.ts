import type { OperatorRole } from "../../../domain/gateways/auth.gateway.js";

export interface UserFixture {
  accountId: string;
  login: string;
  passwordHash: string;
  name: string;
  role: OperatorRole;
}

// passwordHash values are generated at boot with bcrypt.
// Plain fixture passwords (synthetic only): "senha123" for all users.

export const usersFixture: Array<Omit<UserFixture, "passwordHash"> & { password: string }> = [
  { accountId: "usr-001", login: "coordenacao", password: "senha123", name: "Coordenacao", role: "COORDINATION" },
  { accountId: "usr-002", login: "assistente", password: "senha123", name: "Assistente Social", role: "SOCIAL_WORKER" },
  { accountId: "usr-003", login: "estoque", password: "senha123", name: "Estoque", role: "STOCK_DISTRIBUTION" },
];
