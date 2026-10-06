import { Prisma, type PrismaClient } from "@prisma/client";
import { Delivery } from "../../domain/entities/delivery.entity.js";
import { DeliveryLine } from "../../domain/entities/delivery-line.entity.js";
import { DeliveryReversal } from "../../domain/entities/delivery-reversal.entity.js";
import type {
  ConfirmBundle,
  DeliveryFilters,
  DeliveryRepository,
  ReverseBundle,
  ServiceRecordAudit,
} from "../../domain/repositories/delivery.repository.js";

type DeliveryRow = {
  id: string;
  serviceRecordId: string;
  familyId: string;
  assessmentId: string;
  eligibilityStatus: "ELIGIBLE" | "INELIGIBLE" | "PENDING";
  occurredAt: Date;
  collectedByPersonId: string | null;
  collectedByMembershipId: string | null;
  executorName: string;
  executorRole: string;
  exceptionReason: string | null;
  authorizedBy: string | null;
  operationKey: string;
  fingerprint: string;
  status: "COMPLETED" | "REVERSED";
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toEntity(row: DeliveryRow): Delivery {
  return Delivery.rehydrate({
    id: row.id,
    serviceRecordId: row.serviceRecordId,
    familyId: row.familyId,
    assessmentId: row.assessmentId,
    eligibilityStatus: row.eligibilityStatus,
    occurredAt: toDateOnly(row.occurredAt) as never,
    collectedByPersonId: row.collectedByPersonId,
    collectedByMembershipId: row.collectedByMembershipId,
    executorName: row.executorName,
    executorRole: row.executorRole,
    exceptionReason: row.exceptionReason,
    authorizedBy: row.authorizedBy,
    operationKey: row.operationKey,
    fingerprint: row.fingerprint,
    status: row.status,
  });
}

export function isSerializationFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "40001");
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export class PrismaDeliveryRepository implements DeliveryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Delivery | null> {
    const row = await this.prisma.delivery.findUnique({ where: { id } });
    if (row === null) return null;
    return toEntity(row as unknown as DeliveryRow);
  }

  async findByOperationKey(operationKey: string): Promise<Delivery | null> {
    const row = await this.prisma.delivery.findUnique({ where: { operationKey } });
    if (row === null) return null;
    return toEntity(row as unknown as DeliveryRow);
  }

  async findByServiceRecordId(serviceRecordId: string): Promise<Delivery | null> {
    const row = await this.prisma.delivery.findUnique({ where: { serviceRecordId } });
    if (row === null) return null;
    return toEntity(row as unknown as DeliveryRow);
  }

  async findLinesByDeliveryId(deliveryId: string): Promise<DeliveryLine[]> {
    const rows = await this.prisma.deliveryLine.findMany({ where: { deliveryId } });
    return rows.map((row) =>
      DeliveryLine.rehydrate({
        id: row.id,
        deliveryId: row.deliveryId,
        stockLotId: row.stockLotId,
        unitId: row.unitId,
        quantity: Number(row.quantity),
      }),
    );
  }

  async findReversalByDeliveryId(deliveryId: string): Promise<DeliveryReversal | null> {
    const row = await this.prisma.deliveryReversal.findUnique({ where: { deliveryId } });
    if (row === null) return null;
    return DeliveryReversal.rehydrate({
      id: row.id,
      deliveryId: row.deliveryId,
      reason: row.reason,
      reversedAt: toDateOnly(row.reversedAt) as never,
      reversedBy: row.reversedBy,
    });
  }

  async list(filters: DeliveryFilters): Promise<Delivery[]> {
    const rows = await this.prisma.delivery.findMany({
      where: {
        ...(filters.familyId ? { familyId: filters.familyId } : {}),
        ...(filters.from ? { occurredAt: { gte: new Date(filters.from) } } : {}),
        ...(filters.to ? { occurredAt: { lte: new Date(filters.to) } } : {}),
      },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map((row) => toEntity(row as unknown as DeliveryRow));
  }

  async confirmFull(bundle: ConfirmBundle, audit: ServiceRecordAudit): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
            const { record, delivery, lines, movements } = bundle;
            await tx.serviceRecord.create({
              data: {
                id: record.id,
                activityId: record.activityId,
                serviceTypeId: record.serviceTypeId,
                serviceTypeName: record.serviceTypeName,
                familyId: record.familyId,
                personId: record.personId,
                membershipId: record.membershipId,
                executorName: record.executor.executorName,
                executorRole: record.executor.executorRole,
                occurredAt: new Date(record.occurredAt),
                recordedAt: new Date(record.recordedAt),
                recordedBy: record.recordedBy,
                note: record.note,
                cancelReason: record.cancelReason,
                status: record.status,
                revision: record.revision,
              },
            });
            await tx.serviceRecordAuditEntry.create({
              data: {
                serviceRecordId: record.id,
                operation: "CREATED",
                performedBy: audit.performedBy,
                before: audit.before === null ? undefined : (audit.before as object),
                after: audit.after as object,
                reason: audit.reason,
              },
            });
            await tx.delivery.create({
              data: {
                id: delivery.id,
                serviceRecordId: delivery.serviceRecordId,
                familyId: delivery.familyId,
                assessmentId: delivery.assessmentId,
                eligibilityStatus: delivery.eligibilityStatus,
                occurredAt: new Date(delivery.occurredAt),
                collectedByPersonId: delivery.collectedByPersonId,
                collectedByMembershipId: delivery.collectedByMembershipId,
                executorName: delivery.executorName,
                executorRole: delivery.executorRole,
                exceptionReason: delivery.exceptionReason,
                authorizedBy: delivery.authorizedBy,
                operationKey: delivery.operationKey,
                fingerprint: delivery.fingerprint,
                status: delivery.status,
              },
            });
            for (const line of lines) {
              await tx.deliveryLine.create({
                data: { id: line.id, deliveryId: line.deliveryId, stockLotId: line.stockLotId, unitId: line.unitId, quantity: line.quantity },
              });
            }
            for (const movement of movements) {
              await tx.stockMovement.create({
                data: {
                  id: movement.id,
                  itemId: movement.itemId,
                  unitId: movement.unitId,
                  lotId: movement.lotId,
                  receiptLineId: movement.receiptLineId,
                  countLineId: movement.countLineId,
                  type: movement.type,
                  quantity: movement.quantity,
                  balanceDelta: movement.balanceDelta,
                  occurredAt: new Date(movement.occurredAt),
                  recordedBy: movement.recordedBy,
                  reason: movement.reason,
                  operationKey: movement.operationKey,
                  reversesMovementId: movement.reversesMovementId,
                },
              });
            }
          },
      { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 },
    );
  }

  async reverseFull(bundle: ReverseBundle, audit: ServiceRecordAudit): Promise<void> {
    const { delivery, record, reversal, movements } = bundle;
    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryReversal.create({
        data: { id: reversal.id, deliveryId: reversal.deliveryId, reason: reversal.reason, reversedAt: new Date(reversal.reversedAt), reversedBy: reversal.reversedBy },
      });
      for (const movement of movements) {
        await tx.stockMovement.create({
          data: {
            id: movement.id,
            itemId: movement.itemId,
            unitId: movement.unitId,
            lotId: movement.lotId,
            receiptLineId: movement.receiptLineId,
            countLineId: movement.countLineId,
            type: movement.type,
            quantity: movement.quantity,
            balanceDelta: movement.balanceDelta,
            occurredAt: new Date(movement.occurredAt),
            recordedBy: movement.recordedBy,
            reason: movement.reason,
            operationKey: movement.operationKey,
            reversesMovementId: movement.reversesMovementId,
          },
        });
      }
      await tx.delivery.update({ where: { id: delivery.id }, data: { status: "REVERSED" } });
      const updated = await tx.serviceRecord.updateMany({
        where: { id: record.id, revision: record.revision - 1 },
        data: { status: "REVERSED", revision: record.revision },
      });
      if (updated.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError("Concurrent revision conflict on service record reversal", {
          code: "P2034",
          clientVersion: "6.7.0",
        });
      }
      await tx.serviceRecordAuditEntry.create({
        data: {
          serviceRecordId: record.id,
          operation: "REVERSED",
          performedBy: audit.performedBy,
          before: audit.before as object,
          after: audit.after as object,
          reason: audit.reason,
        },
      });
    });
  }
}

