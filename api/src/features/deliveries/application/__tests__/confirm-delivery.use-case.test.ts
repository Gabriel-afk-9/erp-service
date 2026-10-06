import { describe, expect, it } from "vitest";
import type { ActivityGateway } from "../../../../shared/domain/gateways/activity.gateway.js";
import type { EligibilityGateway } from "../../../../shared/domain/gateways/eligibility.gateway.js";
import type { RegistryGateway } from "../../../../shared/domain/gateways/registry.gateway.js";
import { Category } from "../../../inventory/domain/entities/category.entity.js";
import { Item } from "../../../inventory/domain/entities/item.entity.js";
import { StockLot } from "../../../inventory/domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../../inventory/domain/entities/stock-movement.entity.js";
import { Unit } from "../../../inventory/domain/entities/unit.entity.js";
import type { ItemRepository } from "../../../inventory/domain/repositories/item.repository.js";
import type { LotRepository } from "../../../inventory/domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../../inventory/domain/repositories/movement.repository.js";
import { DecimalPlaces } from "../../../inventory/domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../../inventory/domain/value-objects/quantity-increment.value-object.js";
import { Delivery } from "../../domain/entities/delivery.entity.js";
import { DeliveryLine } from "../../domain/entities/delivery-line.entity.js";
import { DeliveryReversal } from "../../domain/entities/delivery-reversal.entity.js";
import { EligibilityJustificationRequiredError } from "../../domain/errors/eligibility-justification-required.error.js";
import { InsufficientBalanceError } from "../../domain/errors/insufficient-balance.error.js";
import type { ConfirmBundle, DeliveryRepository } from "../../domain/repositories/delivery.repository.js";
import { ConfirmDeliveryUseCase } from "../use-cases/confirm-delivery/confirm-delivery.use-case.js";

class FakeDeliveries implements DeliveryRepository {
  readonly byKey = new Map<string, Delivery>();
  confirmed = 0;
  lastBundle: ConfirmBundle | null = null;

  async findById(): Promise<null> {
    return null;
  }

  async findByOperationKey(key: string): Promise<Delivery | null> {
    return this.byKey.get(key) ?? null;
  }

  async findByServiceRecordId(): Promise<null> {
    return null;
  }

  async findLinesByDeliveryId(): Promise<DeliveryLine[]> {
    return [];
  }

  async findReversalByDeliveryId(): Promise<null> {
    return null;
  }

  async list(): Promise<Delivery[]> {
    return [];
  }

  async confirmFull(bundle: ConfirmBundle): Promise<void> {
    this.confirmed += 1;
    this.lastBundle = bundle;
    this.byKey.set(bundle.delivery.operationKey, bundle.delivery);
  }

  async reverseFull(): Promise<void> {}
}

class FakeItems implements ItemRepository {
  constructor(readonly item: Item) {}

  async save(): Promise<void> {}

  async findById(): Promise<Item | null> {
    return this.item;
  }

  async findByCategoryAndName(): Promise<Item | null> {
    return null;
  }

  async findByQuery(): Promise<Item[]> {
    return [];
  }
}

class FakeLots implements LotRepository {
  constructor(readonly lot: StockLot) {}

  async save(): Promise<void> {}

  async findById(): Promise<StockLot | null> {
    return this.lot;
  }

  async findByReceiptLineId(): Promise<null> {
    return null;
  }

  async findByItem(): Promise<StockLot[]> {
    return [this.lot];
  }

  async listAll(): Promise<StockLot[]> {
    return [this.lot];
  }
}

class FakeMovements implements MovementRepository {
  balance = 5;

  async append(movement: StockMovement): Promise<void> {
    this.balance += movement.balanceDelta;
  }

  async findByOperationKey(): Promise<null> {
    return null;
  }

  async hasOpeningBalance(): Promise<boolean> {
    return true;
  }

  async sumDeltaByItem(): Promise<number> {
    return this.balance;
  }

  async sumDeltaByLot(): Promise<number> {
    return this.balance;
  }

  async listByItem(): Promise<StockMovement[]> {
    return [];
  }
}

const registry: RegistryGateway = {
  findFamily: async (familyId: string) => ({
    familyId,
    familyNumber: "000001",
    address: { street: "Rua", neighborhood: "Bairro", zipCode: "60000000", locationType: "URBAN" as const },
    phone: null,
    revision: 1,
  }),
  findFamiliesByQuery: async () => [],
  resolveMembership: async () => null,
  listActiveMemberships: async () => [],
};

const activity: ActivityGateway = {
  requireOneOffActivity: async (activityId: string) => ({
    activityId,
    name: "Entrega de cestas",
    nature: "ONE_OFF" as const,
    serviceType: { serviceTypeId: "st-donation", code: "ITEM_DONATION", name: "Doacao de itens" },
    revision: 1,
    isActive: true,
  }),
  listActiveOneOffActivities: async () => [],
};

const eligibility: EligibilityGateway = {
  evaluate: async (familyId: string, referenceDate: string) => ({
    assessmentId: "as-1",
    familyId,
    referenceDate,
    evaluatedAt: new Date().toISOString(),
    status: "PENDING" as const,
    policyId: null,
    pendingReason: "Sem politica",
    evidences: [],
  }),
};

function setup() {
  const category = Category.create({ name: "Alimentos" });
  const unit = Unit.create({ symbol: "KG", name: "Quilograma", decimalPlaces: DecimalPlaces.of(0), quantityIncrement: QuantityIncrement.of(1) });
  const item = Item.create({ categoryId: category.id, unitId: unit.id, name: "Arroz 1kg", requiresExpiration: false });
  const lot = StockLot.create({ itemId: item.id, unitId: unit.id });
  const deliveries = new FakeDeliveries();
  const movements = new FakeMovements();
  const useCase = new ConfirmDeliveryUseCase(
    deliveries,
    new FakeItems(item),
    new FakeLots(lot),
    movements,
    registry,
    activity,
    eligibility,
  );
  const base = {
    familyId: "fam-1",
    occurredAt: "2024-03-01",
    lines: [{ lotId: lot.id, quantity: 2 }],
    executorName: "Joana",
    executorRole: "Assistente",
    actorId: "op",
  };
  return { deliveries, movements, useCase, base, lot };
}

describe("ConfirmDeliveryUseCase", () => {
  it("PENDING without justification throws", async () => {
    const { useCase, base } = setup();
    await expect(
      useCase.execute({ ...base, operationKey: "11111111-1111-1111-1111-111111111111" }),
    ).rejects.toThrow(EligibilityJustificationRequiredError);
  });

  it("confirms with justification and emits DELIVERY_OUT", async () => {
    const { deliveries, useCase, base } = setup();
    const output = await useCase.execute({
      ...base,
      operationKey: "22222222-2222-2222-2222-222222222222",
      exceptionReason: "Familia vulneravel",
      authorizedBy: "Coordenacao",
    });
    expect(output.duplicate).toBe(false);
    expect(deliveries.confirmed).toBe(1);
    expect(output.serviceRecordId).toBeTruthy();
    const outflow = deliveries.lastBundle?.movements[0];
    expect(outflow?.type).toBe("DELIVERY_OUT");
    expect(outflow?.balanceDelta).toBe(-2);
  });

  it("repeated key returns duplicate without new outflow (AC-05)", async () => {
    const { deliveries, useCase, base } = setup();
    const justified = { ...base, operationKey: "33333333-3333-3333-3333-333333333333", exceptionReason: "Vulneravel", authorizedBy: "Coord" };
    const first = await useCase.execute(justified);
    const second = await useCase.execute(justified);
    expect(second.duplicate).toBe(true);
    expect(second.deliveryId).toBe(first.deliveryId);
    expect(deliveries.confirmed).toBe(1);
  });

  it("insufficient balance blocks with nothing persisted (AC-06)", async () => {
    const { deliveries, useCase, base, lot } = setup();
    await expect(
      useCase.execute({
        ...base,
        lines: [{ lotId: lot.id, quantity: 99 }],
        operationKey: "44444444-4444-4444-4444-444444444444",
        exceptionReason: "Vulneravel",
        authorizedBy: "Coord",
      }),
    ).rejects.toThrow(InsufficientBalanceError);
    expect(deliveries.confirmed).toBe(0);
  });
});

