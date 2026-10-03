import { ExecutorInfoInvalidError } from "../errors/executor-info-invalid.error.js";

export interface ExecutorInfo {
  readonly executorName: string;
  readonly executorRole: string;
}

export function createExecutorInfo(name: string, role: string): ExecutorInfo {
  const executorName = name.trim();
  const executorRole = role.trim();
  if (executorName.length < 2) {
    throw new ExecutorInfoInvalidError("executor name must have at least 2 characters");
  }
  if (executorRole.length < 2) {
    throw new ExecutorInfoInvalidError("executor role must have at least 2 characters");
  }
  return { executorName, executorRole };
}
