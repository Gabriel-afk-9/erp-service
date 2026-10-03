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
import { CancelServiceRecordUseCase } from "./features/atd/application/use-cases/cancel-service-record/cancel-service-record.use-case.js";
import { CorrectServiceRecordNoteUseCase } from "./features/atd/application/use-cases/correct-service-record-note/correct-service-record-note.use-case.js";
import { GetServiceRecordUseCase } from "./features/atd/application/use-cases/get-service-record/get-service-record.use-case.js";
import { ListServiceRecordsByFamilyUseCase } from "./features/atd/application/use-cases/list-service-records-by-family/list-service-records-by-family.use-case.js";
import { RegisterServiceRecordUseCase } from "./features/atd/application/use-cases/register-service-record/register-service-record.use-case.js";
import { PrismaServiceRecordRepository } from "./features/atd/infrastructure/repositories/prisma-service-record.repository.js";
import { registerServiceRecordRoutes } from "./features/atd/presentation/routes/service-record.routes.js";
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
  await registerServiceRecordRoutes(app, {
    register: new RegisterServiceRecordUseCase(serviceRecordRepository, registry, activity),
    cancel: new CancelServiceRecordUseCase(serviceRecordRepository),
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

  return app;
}