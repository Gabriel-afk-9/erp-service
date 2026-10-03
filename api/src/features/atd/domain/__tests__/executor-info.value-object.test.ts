import { describe, expect, it } from "vitest";
import { ExecutorInfoInvalidError } from "../../domain/errors/executor-info-invalid.error.js";
import { createExecutorInfo } from "../../domain/value-objects/executor-info.value-object.js";

describe("createExecutorInfo", () => {
  it("creates with a valid name and role", () => {
    const executor = createExecutorInfo("Joao Souza", "Medico");
    expect(executor.executorName).toBe("Joao Souza");
    expect(executor.executorRole).toBe("Medico");
  });

  it("throws for an empty name", () => {
    expect(() => createExecutorInfo(" ", "Medico")).toThrow(ExecutorInfoInvalidError);
  });

  it("throws for an empty role", () => {
    expect(() => createExecutorInfo("Joao Souza", " ")).toThrow(ExecutorInfoInvalidError);
  });
});
