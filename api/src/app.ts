import bcrypt from "bcrypt";
import Fastify, { type FastifyInstance } from "fastify";
import { InMemoryActivityGateway } from "./shared/infrastructure/gateways/in-memory-activity.gateway.js";
import { JwtAuthGateway } from "./shared/infrastructure/gateways/jwt-auth.gateway.js";
import { activitiesFixture } from "./shared/infrastructure/gateways/fixtures/activities.fixture.js";
import { usersFixture } from "./shared/infrastructure/gateways/fixtures/users.fixture.js";
import { makeAuthenticateMiddleware } from "./shared/presentation/middleware/authenticate.middleware.js";
import { authorize } from "./shared/presentation/middleware/authorize.middleware.js";
import { registerAuthRoutes } from "./shared/presentation/routes/auth.routes.js";
import { PrismaRegistryGateway } from "./shared/infrastructure/gateways/prisma-registry.gateway.js";
import { PrismaFamilyRepository } from "./features/registration/infrastructure/repositories/prisma-family.repository.js";
import { PrismaMembershipRepository } from "./features/registration/infrastructure/repositories/prisma-membership.repository.js";
import { PrismaPersonRepository } from "./features/registration/infrastructure/repositories/prisma-person.repository.js";
import { PrismaRegistrationUnitOfWork } from "./features/registration/infrastructure/registration-unit-of-work.js";
import { PrismaFamilyCodeGenerator } from "./features/registration/infrastructure/gateways/prisma-family-code-generator.gateway.js";
import { CreateFamilyUseCase } from "./features/registration/application/use-cases/create-family/create-family.use-case.js";
import { CorrectFamilyUseCase } from "./features/registration/application/use-cases/correct-family/correct-family.use-case.js";
import { EndFamilyMembershipUseCase } from "./features/registration/application/use-cases/end-family-membership/end-family-membership.use-case.js";
import { AddFamilyMemberUseCase } from "./features/registration/application/use-cases/add-family-member/add-family-member.use-case.js";
import { GetFamilyUseCase } from "./features/registration/application/use-cases/get-family/get-family.use-case.js";
import { SearchFamiliesUseCase } from "./features/registration/application/use-cases/search-families/search-families.use-case.js";
import { registerFamilyRoutes } from "./features/registration/presentation/routes/families.routes.js";
import { RegisterPersonUseCase } from "./features/registration/application/use-cases/register-person/register-person.use-case.js";
import { CorrectPersonUseCase } from "./features/registration/application/use-cases/correct-person/correct-person.use-case.js";
import { GetPersonUseCase } from "./features/registration/application/use-cases/get-person/get-person.use-case.js";
import { SearchPersonsUseCase } from "./features/registration/application/use-cases/search-persons/search-persons.use-case.js";
import { registerPersonRoutes } from "./features/registration/presentation/routes/persons.routes.js";
import { CreateCategoryUseCase } from "./features/inventory/application/use-cases/create-category/create-category.use-case.js";
import { CreateItemUseCase } from "./features/inventory/application/use-cases/create-item/create-item.use-case.js";
import { CreateUnitUseCase } from "./features/inventory/application/use-cases/create-unit/create-unit.use-case.js";
import { DeactivateCategoryUseCase } from "./features/inventory/application/use-cases/deactivate-category/deactivate-category.use-case.js";
import { DeactivateItemUseCase } from "./features/inventory/application/use-cases/deactivate-item/deactivate-item.use-case.js";
import { GetCategoryUseCase } from "./features/inventory/application/use-cases/get-category/get-category.use-case.js";
import { GetItemUseCase } from "./features/inventory/application/use-cases/get-item/get-item.use-case.js";
import { ListCategoriesUseCase } from "./features/inventory/application/use-cases/list-categories/list-categories.use-case.js";
import { ListItemsUseCase } from "./features/inventory/application/use-cases/list-items/list-items.use-case.js";
import { ListUnitsUseCase } from "./features/inventory/application/use-cases/list-units/list-units.use-case.js";
import { UpdateCategoryUseCase } from "./features/inventory/application/use-cases/update-category/update-category.use-case.js";
import { UpdateItemUseCase } from "./features/inventory/application/use-cases/update-item/update-item.use-case.js";
import { PrismaCategoryRepository } from "./features/inventory/infrastructure/repositories/prisma-category.repository.js";
import { PrismaItemRepository } from "./features/inventory/infrastructure/repositories/prisma-item.repository.js";
import { PrismaUnitRepository } from "./features/inventory/infrastructure/repositories/prisma-unit.repository.js";
import { registerInventoryRoutes } from "./features/inventory/presentation/routes/inventory.routes.js";
import { AdjustStockUseCase } from "./features/inventory/application/use-cases/adjust-stock/adjust-stock.use-case.js";
import { CloseStockCountUseCase } from "./features/inventory/application/use-cases/close-count/close-count.use-case.js";
import { ConfirmStockReceiptUseCase } from "./features/inventory/application/use-cases/confirm-receipt/confirm-receipt.use-case.js";
import { CreateStockCountUseCase } from "./features/inventory/application/use-cases/create-count/create-count.use-case.js";
import { GetItemBalanceUseCase } from "./features/inventory/application/use-cases/get-item-balance/get-item-balance.use-case.js";
import { GetItemMovementsUseCase } from "./features/inventory/application/use-cases/get-item-movements/get-item-movements.use-case.js";
import { GetReceiptUseCase } from "./features/inventory/application/use-cases/get-receipt/get-receipt.use-case.js";
import { ListItemsWithBalanceUseCase } from "./features/inventory/application/use-cases/list-items-with-balance/list-items-with-balance.use-case.js";
import { ListReceiptsUseCase } from "./features/inventory/application/use-cases/list-receipts/list-receipts.use-case.js";
import { RecordCountLineUseCase } from "./features/inventory/application/use-cases/record-count-line/record-count-line.use-case.js";
import { PrismaCountRepository } from "./features/inventory/infrastructure/repositories/prisma-count.repository.js";
import { PrismaLotRepository } from "./features/inventory/infrastructure/repositories/prisma-lot.repository.js";
import { PrismaMovementRepository } from "./features/inventory/infrastructure/repositories/prisma-movement.repository.js";
import { PrismaReceiptRepository } from "./features/inventory/infrastructure/repositories/prisma-receipt.repository.js";
import { registerStockRoutes } from "./features/inventory/presentation/routes/stock.routes.js";
import { GetBazarTransferUseCase } from "./features/inventory/application/use-cases/get-bazar-transfer/get-bazar-transfer.use-case.js";
import { ListBazarTransfersUseCase } from "./features/inventory/application/use-cases/list-bazar-transfers/list-bazar-transfers.use-case.js";
import { RegisterBazarTransferUseCase } from "./features/inventory/application/use-cases/register-bazar-transfer/register-bazar-transfer.use-case.js";
import { PrismaBazarTransferRepository } from "./features/inventory/infrastructure/repositories/prisma-bazar-transfer.repository.js";
import { registerBazarRoutes } from "./features/inventory/presentation/routes/bazar.routes.js";
import { CancelServiceRecordUseCase } from "./features/atd/application/use-cases/cancel-service-record/cancel-service-record.use-case.js";
import { CorrectServiceRecordNoteUseCase } from "./features/atd/application/use-cases/correct-service-record-note/correct-service-record-note.use-case.js";
import { GetServiceRecordUseCase } from "./features/atd/application/use-cases/get-service-record/get-service-record.use-case.js";
import { ListServiceRecordsByFamilyUseCase } from "./features/atd/application/use-cases/list-service-records-by-family/list-service-records-by-family.use-case.js";
import { RegisterServiceRecordUseCase } from "./features/atd/application/use-cases/register-service-record/register-service-record.use-case.js";
import { PrismaServiceRecordRepository } from "./features/atd/infrastructure/repositories/prisma-service-record.repository.js";
import { registerServiceRecordRoutes } from "./features/atd/presentation/routes/service-record.routes.js";
import { PendingEligibilityGateway } from "./shared/infrastructure/gateways/pending-eligibility.gateway.js";
import { ConfirmDeliveryUseCase } from "./features/deliveries/application/use-cases/confirm-delivery/confirm-delivery.use-case.js";
import { GetDeliveryUseCase } from "./features/deliveries/application/use-cases/get-delivery/get-delivery.use-case.js";
import { ListDeliveriesUseCase } from "./features/deliveries/application/use-cases/list-deliveries/list-deliveries.use-case.js";
import { PreviewDeliveryUseCase } from "./features/deliveries/application/use-cases/preview-delivery/preview-delivery.use-case.js";
import { ReverseDeliveryUseCase } from "./features/deliveries/application/use-cases/reverse-delivery/reverse-delivery.use-case.js";
import { PrismaDeliveryRepository } from "./features/deliveries/infrastructure/repositories/prisma-delivery.repository.js";
import { registerDeliveryRoutes } from "./features/deliveries/presentation/routes/delivery.routes.js";
import { DeliveryReportUseCase } from "./features/reports/application/use-cases/delivery-report/delivery-report.use-case.js";
import { StockMovementReportUseCase } from "./features/reports/application/use-cases/stock-movement-report/stock-movement-report.use-case.js";
import { PrismaReportRepository } from "./features/reports/infrastructure/repositories/prisma-report.repository.js";
import { registerReportRoutes } from "./features/reports/presentation/routes/report.routes.js";
import { prisma } from "./shared/infrastructure/database/prisma.client.js";

export async function createApp(): Promise<FastifyInstance> {
  const usersWithHash = await Promise.all(
    usersFixture.map(async (u) => ({ ...u, passwordHash: await bcrypt.hash(u.password, 10) })),
  );

  const registry = new PrismaRegistryGateway(prisma);
  const activity = new InMemoryActivityGateway(activitiesFixture);
  const auth = new JwtAuthGateway(usersWithHash);

  const familyRepo = new PrismaFamilyRepository(prisma);
  const membershipRepo = new PrismaMembershipRepository(prisma);
  const personRepo = new PrismaPersonRepository(prisma);
  const uow = new PrismaRegistrationUnitOfWork(prisma);
  const codeGenerator = new PrismaFamilyCodeGenerator(prisma);

  const createFamily = new CreateFamilyUseCase(uow, codeGenerator);
  const correctFamily = new CorrectFamilyUseCase(uow);
  const getFamily = new GetFamilyUseCase(familyRepo, membershipRepo, personRepo);
  const searchFamilies = new SearchFamiliesUseCase(familyRepo, membershipRepo);
  const addMember = new AddFamilyMemberUseCase(uow);
  const endMembership = new EndFamilyMembershipUseCase(uow);
  const registerPerson = new RegisterPersonUseCase(uow);
  const correctPerson = new CorrectPersonUseCase(uow);
  const getPerson = new GetPersonUseCase(personRepo, membershipRepo, familyRepo);
  const searchPersons = new SearchPersonsUseCase(personRepo, membershipRepo, familyRepo);

  const app = Fastify({ logger: true });

  app.get("/health", async (_request, reply) => {
    await reply.status(200).send({ status: "ok", timestamp: new Date().toISOString() });
  });

  await registerAuthRoutes(app, auth);

  const authenticate = makeAuthenticateMiddleware(auth);
  app.addHook("onRequest", async (request, reply) => {
    const url = request.url;
    if (url === "/health" || url === "/auth/login") return;
    await authenticate(request, reply);
  });

  app.get(
    "/admin/ping",
    { preHandler: [authorize(["COORDINATION"])] },
    async (_request, reply) => {
      await reply.status(200).send({ data: { pong: true } });
    },
  );

  const serviceRecordRepository = new PrismaServiceRecordRepository(prisma);
  const deliveryRepository = new PrismaDeliveryRepository(prisma);
  const eligibility = new PendingEligibilityGateway();
  const checkNoDelivery = async (serviceRecordId: string): Promise<boolean> =>
    (await deliveryRepository.findByServiceRecordId(serviceRecordId)) === null;
  await registerServiceRecordRoutes(app, {
    register: new RegisterServiceRecordUseCase(serviceRecordRepository, registry, activity),
    cancel: new CancelServiceRecordUseCase(serviceRecordRepository, checkNoDelivery),
    correctNote: new CorrectServiceRecordNoteUseCase(serviceRecordRepository),
    get: new GetServiceRecordUseCase(serviceRecordRepository),
    listByFamily: new ListServiceRecordsByFamilyUseCase(serviceRecordRepository),
  });

  await registerFamilyRoutes(app, {
    create: createFamily,
    get: getFamily,
    correct: correctFamily,
    search: searchFamilies,
    addMember,
    endMembership,
  });

  await registerPersonRoutes(app, {
    register: registerPerson,
    get: getPerson,
    correct: correctPerson,
    search: searchPersons,
  });

  const categoryRepository = new PrismaCategoryRepository(prisma);
  const unitRepository = new PrismaUnitRepository(prisma);
  const itemRepository = new PrismaItemRepository(prisma);

  await registerInventoryRoutes(app, {
    createCategory: new CreateCategoryUseCase(categoryRepository),
    updateCategory: new UpdateCategoryUseCase(categoryRepository),
    deactivateCategory: new DeactivateCategoryUseCase(categoryRepository),
    listCategories: new ListCategoriesUseCase(categoryRepository),
    getCategory: new GetCategoryUseCase(categoryRepository, itemRepository, unitRepository),
    createUnit: new CreateUnitUseCase(unitRepository),
    listUnits: new ListUnitsUseCase(unitRepository),
    createItem: new CreateItemUseCase(itemRepository, categoryRepository, unitRepository),
    updateItem: new UpdateItemUseCase(itemRepository, categoryRepository),
    deactivateItem: new DeactivateItemUseCase(itemRepository),
    listItems: new ListItemsUseCase(itemRepository, categoryRepository, unitRepository),
    getItem: new GetItemUseCase(itemRepository, categoryRepository, unitRepository),
  });

  const receiptRepository = new PrismaReceiptRepository(prisma);
  const lotRepository = new PrismaLotRepository(prisma);
  const movementRepository = new PrismaMovementRepository(prisma);
  const countRepository = new PrismaCountRepository(prisma);

  await registerStockRoutes(app, {
    confirmReceipt: new ConfirmStockReceiptUseCase(receiptRepository, itemRepository, unitRepository),
    getReceipt: new GetReceiptUseCase(receiptRepository, itemRepository, unitRepository, lotRepository),
    listReceipts: new ListReceiptsUseCase(receiptRepository),
    getItemBalance: new GetItemBalanceUseCase(itemRepository, lotRepository, movementRepository),
    listItemsWithBalance: new ListItemsWithBalanceUseCase(itemRepository, categoryRepository, unitRepository, lotRepository, movementRepository),
    getItemMovements: new GetItemMovementsUseCase(itemRepository, movementRepository),
    adjustStock: new AdjustStockUseCase(itemRepository, lotRepository, movementRepository),
    createCount: new CreateStockCountUseCase(countRepository, lotRepository, movementRepository),
    recordCountLine: new RecordCountLineUseCase(countRepository, lotRepository, itemRepository),
    closeCount: new CloseStockCountUseCase(countRepository, lotRepository, movementRepository, itemRepository),
  });

  const bazarTransferRepository = new PrismaBazarTransferRepository(prisma);

  await registerBazarRoutes(app, {
    register: new RegisterBazarTransferUseCase(bazarTransferRepository, receiptRepository, itemRepository, unitRepository),
    get: new GetBazarTransferUseCase(bazarTransferRepository, receiptRepository, itemRepository, lotRepository),
    list: new ListBazarTransfersUseCase(bazarTransferRepository),
  });

  await registerDeliveryRoutes(app, {
    confirm: new ConfirmDeliveryUseCase(deliveryRepository, itemRepository, lotRepository, movementRepository, registry, activity, eligibility),
    reverse: new ReverseDeliveryUseCase(deliveryRepository, serviceRecordRepository, lotRepository, movementRepository),
    preview: new PreviewDeliveryUseCase(deliveryRepository, registry, eligibility),
    get: new GetDeliveryUseCase(deliveryRepository),
    list: new ListDeliveriesUseCase(deliveryRepository),
  });

  const reportRepository = new PrismaReportRepository(prisma);

  await registerReportRoutes(app, {
    stockMovements: new StockMovementReportUseCase(reportRepository),
    deliveries: new DeliveryReportUseCase(reportRepository),
  });

  return app;
}