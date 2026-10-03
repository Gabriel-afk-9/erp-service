export type OperatorRole =
  | "COORDINATION"
  | "SOCIAL_WORKER"
  | "ACTIVITY_MANAGER"
  | "STOCK_DISTRIBUTION";

export interface AuthenticatedOperator {
  accountId: string;
  name: string;
  role: OperatorRole;
}

export interface AuthGateway {
  authenticate(login: string, password: string): Promise<{ token: string; operator: AuthenticatedOperator }>;
  verify(token: string): Promise<AuthenticatedOperator>;
}
