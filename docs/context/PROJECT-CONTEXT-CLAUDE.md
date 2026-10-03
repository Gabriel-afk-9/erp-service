# Project Context — ERP Social Luz da Esperança (Frente AD)

> Documento de continuidade técnica do projeto.
> Gerado a partir da sessão de orientação técnica com Claude (mentor/arquiteto).
> Este arquivo deve ser atualizado ao final de cada etapa relevante de desenvolvimento.

**Última atualização:** 2026-10-03
**Estado:** Fundação evolutiva concluída. ATD-Core planejado, não iniciado.
**Último ponto alcançado:** BUILD 1 (fundação) validado — 21/21 testes passando, typecheck limpo, rotas de auth funcionando. Migrations nunca executadas contra banco real (Docker inativo durante a sessão).

---

## 1. Visão geral do projeto

### Objetivo do sistema
ERP Social para a organização **Luz da Esperança**. O sistema acompanha pessoas assistidas e suas famílias, registra atendimentos, controla estoque de doações e gerencia entregas às famílias beneficiadas.

### Problema que o projeto resolve
Substituir o sistema legado **Bússola Social** por uma plataforma moderna, com rastreabilidade de fatos históricos, controle de estoque, aptidão familiar baseada em frequência e auditoria completa de operações.

### Divisão de responsabilidades entre desenvolvedores

| Desenvolvedor | Módulos |
|---|---|
| **Gabriel** (este repositório) | ATD, EST, ENT, BAZ |
| **Fabrício** | FRQ, APT |
| **Ambos (compartilhado)** | CAD, FIC, ATV, REL, ACS, MIG |

> **Atenção:** este repositório implementa **apenas a frente AD** (Gabriel). As entidades compartilhadas (Família, Pessoa, Atividade, Usuário) **não são duplicadas aqui** — são acessadas via interfaces de gateway. Quando o BC do Fabrício estiver pronto, troca-se o adapter sem alterar o domínio.

### Escopo atual do protótipo (frente AD)

| Módulo | Descrição | RFs |
|---|---|---|
| **ATD** | Atendimentos pontuais e visita domiciliar | RF-ATD-01 a 08 |
| **EST** | Estoque social (itens, entradas, saldo, ajustes) | RF-EST-01 a 10 |
| **ENT** | Entregas às famílias | RF-ENT-01 a 07 |
| **BAZ** | Recebimento de itens do Bazar | RF-BAZ-01 a 04 |

**Fora do escopo deste protótipo:** RF-ATD-09 (agendamento, Desejável), RF-ENT-08 (compatibilidade), RF-ENT-09 (prioridade), RF-EST-11 (consolidação por doador), relatórios (BUILD separado), migração do Bússola Social.

### Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript (frontend, backend, shared) |
| Backend | Node.js + Fastify |
| Validação HTTP | Zod |
| Autenticação | jose (JWT) + bcrypt |
| Banco de dados | PostgreSQL via Prisma |
| Cache | Redis |
| Testes | Vitest |
| Frontend | React + Tailwind CSS + React Router (SPA) |
| Infraestrutura local | Docker Compose |
| Gerenciador de pacotes | pnpm |

> Todas as versões de dependências devem ser fixadas **sem `^`**.

### Arquitetura adotada

**Feature First + Clean Architecture + DDD + SOLID**

Cada feature possui 4 camadas:
```
domain/         ← entidades, value objects, interfaces de repositório, errors — SEM deps externas
application/    ← use cases, inputs, outputs — depende só do domain
infrastructure/ ← implementações de repositório (Prisma), adapters — implementa contratos do domain
presentation/   ← Fastify routes + Zod validators — thin, delega ao use case
```

Fluxo de dependências **obrigatório**:
```
Presentation → Application → Domain
Infrastructure → Domain (implementa contratos)
```

**Proibido em qualquer hipótese:**
- Domain importar Fastify, Prisma, Redis, jose, bcrypt ou qualquer lib externa
- Application importar Infrastructure diretamente
- UseCase instanciar implementação concreta (ex: `new PrismaRepository()`)
- Composition Root fora de `api/src/app.ts`

---

## 2. Estado atual

### ✅ Implementado e validado (BUILD 1 — Fundação)

**Raiz do projeto:**
- `package.json` com scripts de desenvolvimento, testes, build, migrations
- `tsconfig.json` base
- `.env.example` com todas as variáveis necessárias
- `docker-compose.yml` com PostgreSQL 16 e Redis 7
- `.gitignore`

**`api/src/shared/domain/`:**
- Value Objects: `Id`, `CivilDate`, `Instant`, `Revision` (branded types, sem deps externas)
- `DomainError` base + 7 erros específicos: `InvalidCredentialsError`, `TokenExpiredError`, `ActivityNotFoundError`, `ActivityNotOneOffError`, `PersonNotInFamilyError`, `CivilDateFormatError`, `ExecutorInfoInvalidError` *(este último adicionado durante planejamento do ATD)*
- 4 interfaces de gateway: `RegistryGateway`, `ActivityGateway`, `EligibilityGateway`, `AuthGateway`

**`api/src/shared/infrastructure/gateways/`:**
- Fixtures sintéticas: 5 famílias, 10 pessoas (com 1 vínculo encerrado), 3 atividades ONE_OFF ativas + 1 encerrada, 3 usuários
- `InMemoryRegistryGateway` (implementa `RegistryGateway`)
- `InMemoryActivityGateway` (implementa `ActivityGateway`)
- `PendingEligibilityGateway` (implementa `EligibilityGateway` — sempre retorna PENDING)
- `JwtAuthGateway` (implementa `AuthGateway` — jose + bcrypt)
- `prisma.client.ts` (singleton PrismaClient)
- `redis.client.ts`

**`api/src/shared/presentation/`:**
- `authenticate.middleware.ts` (Fastify preHandler — extrai e verifica JWT)
- `authorize.middleware.ts` (factory: `authorize(roles[])` → preHandler)
- `auth.routes.ts`: `POST /auth/login`, `GET /auth/me`
- `GET /health`, `GET /admin/ping` (prova de 403)

**`api/prisma/`:**
- `schema.prisma` com datasource, generator e **11 models placeholder** (só `id`, `createdAt`, `updatedAt`): `ServiceRecord`, `HomeVisit`, `Item`, `Category`, `Unit`, `StockReceipt`, `StockLot`, `StockMovement`, `Delivery`, `DeliveryLine`, `BazarTransfer`
- `seed.ts` — apenas loga os gateways in-memory disponíveis (sem dados no banco)

**`api/src/features/`:**
- Estrutura de pastas criada para `atd/`, `inventory/`, `deliveries/`, `bazar/`
- `atd/domain/repositories/ServiceRecordRepository.ts` — interface criada
- `atd/infrastructure/repositories/PrismaServiceRecordRepository.ts` — esqueleto (sem implementação real)
- Demais features: apenas estrutura de pastas, sem conteúdo

**`web/src/`:**
- `features/auth/presentation/pages/LoginPage.tsx` — funcional
- `shared/application/api-client.ts` — fetch wrapper com Bearer token
- `shared/presentation/components/PrivateRoute.tsx`, `Layout.tsx`
- `shared/presentation/pages/DashboardPage.tsx` — placeholder
- `App.tsx` com React Router: `/` → LoginPage, `/dashboard` → DashboardPage (protegida)

**`docs/decisions/`:**
- `ADR-001-ad-gateways.md` — decisão de usar gateways em vez de duplicar entidades do BC

### ⚠️ Parcialmente implementado / Pendente de validação

- **Migrations nunca executadas contra banco real**: `pnpm db:migrate` não foi rodado (Docker estava inativo durante a sessão). Os models placeholder do schema existem, mas **nenhuma tabela foi criada no PostgreSQL**.
- **`PrismaServiceRecordRepository`**: esqueleto criado, sem implementação dos métodos.

### ❌ Não implementado (planejado)

- `ATD-Core` — entidades, use cases, rotas, testes, colunas de negócio no schema *(próxima feature)*
- `EST` — Estoque social completo
- `BAZ` — Recebimento do Bazar
- `ENT` — Entregas às famílias *(por último — depende de ATD + EST + contrato de aptidão)*
- Specs AD em `docs/specs/` (09 a 12) — não existem ainda
- `ADR-002` — imutabilidade de campos de fato do atendimento *(planejado para BUILD ATD)*
- Relatórios RF-REL-05 e RF-REL-06

### ✅ Funcionando (validado via inject/curl na sessão)

```
GET  /health                              → 200 { status: "ok" }
POST /auth/login (coordenacao/senha123)   → 200 + JWT válido
GET  /auth/me (com token válido)          → 200 + operator
GET  /auth/me (sem token)                 → 401
GET  /admin/ping (token STOCK_DISTRIBUTION em rota COORDINATION) → 403
```

### 🔧 Desvios do plano (conscientes, documentados pelo OpenCode)

1. Estrutura criada na raiz do repo (`api/`, `web/`) em vez de dentro de `erp-atendimento/` — o repo já é o projeto.
2. `users.fixture` guarda senha em texto plano + hash gerado no boot com `bcrypt.hash` (custo 10), em vez de hash fixo no arquivo.
3. `InMemoryActivityGateway.requireOneOffActivity` lança `ActivityNotFoundError` também para atividades inativas (indistinguível por segurança).
4. Root typecheck delega para api + web em vez de chamar `tsc` diretamente.

---

## 3. Estrutura do projeto

```
erp-atendimento/                          ← raiz do repositório
│
├── api/                                  ← Backend Fastify
│   ├── src/
│   │   ├── features/                     ← módulos de domínio AD
│   │   │   ├── atd/                      ← Atendimentos pontuais
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/         ← (vazio — criar em ATD-Core)
│   │   │   │   │   ├── value-objects/    ← (vazio — criar em ATD-Core)
│   │   │   │   │   ├── repositories/     ← ServiceRecordRepository (interface ✅)
│   │   │   │   │   └── errors/           ← (vazio — criar em ATD-Core)
│   │   │   │   ├── application/
│   │   │   │   │   └── use-cases/        ← (vazio — criar em ATD-Core)
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── repositories/     ← PrismaServiceRecordRepository (esqueleto)
│   │   │   │   └── presentation/
│   │   │   │       └── routes/           ← (vazio — criar em ATD-Core)
│   │   │   ├── inventory/                ← Estoque social (pastas vazias)
│   │   │   ├── deliveries/               ← Entregas (pastas vazias)
│   │   │   └── bazar/                    ← Recebimento Bazar (pastas vazias)
│   │   │
│   │   ├── shared/                       ← Infraestrutura compartilhada entre features
│   │   │   ├── domain/
│   │   │   │   ├── value-objects/        ← Id, CivilDate, Instant, Revision ✅
│   │   │   │   ├── errors/               ← DomainError base + 7 erros específicos ✅
│   │   │   │   └── gateways/             ← interfaces de contratos externos ✅
│   │   │   │       ├── registry.gateway.ts     ← contrato de identidade (BC/CAD)
│   │   │   │       ├── activity.gateway.ts     ← contrato de atividades (BC/ATV)
│   │   │   │       ├── eligibility.gateway.ts  ← contrato de aptidão (FRQ/APT)
│   │   │   │       └── auth.gateway.ts         ← contrato de autenticação (BC/ACS)
│   │   │   ├── infrastructure/
│   │   │   │   ├── database/             ← prisma.client.ts ✅
│   │   │   │   ├── cache/                ← redis.client.ts ✅
│   │   │   │   └── gateways/             ← implementações in-memory ✅
│   │   │   │       ├── fixtures/         ← dados sintéticos (famílias, pessoas, atividades, usuários)
│   │   │   │       ├── in-memory-registry.gateway.ts
│   │   │   │       ├── in-memory-activity.gateway.ts
│   │   │   │       ├── pending-eligibility.gateway.ts   ← sempre PENDING (RN-18/LAC-01)
│   │   │   │       └── jwt-auth.gateway.ts
│   │   │   └── presentation/
│   │   │       └── middleware/           ← authenticate.middleware.ts, authorize.middleware.ts ✅
│   │   │
│   │   └── app.ts                        ← Composition Root (único lugar onde concretos são instanciados)
│   │
│   ├── prisma/
│   │   ├── schema.prisma                 ← 11 models placeholder + bloco proibindo Family/Person
│   │   └── seed.ts                       ← apenas loga gateways in-memory
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── web/                                  ← Frontend React SPA
│   └── src/
│       ├── features/auth/presentation/pages/LoginPage.tsx  ✅
│       ├── shared/
│       │   ├── application/api-client.ts       ✅
│       │   └── presentation/components/        ✅
│       ├── App.tsx                             ✅
│       └── main.tsx                            ✅
│
├── docs/
│   ├── specs/                            ← specs do MVP (BC + FRQ — sem specs AD ainda)
│   │   ├── 00-foundation.md             ← SPEC-CORE: tipos, transações, envelopes HTTP
│   │   ├── 01-access.md                 ← SPEC-ACS: auth, roles, sessão
│   │   ├── 02-registration.md           ← SPEC-CAD: Family, Person, Membership
│   │   ├── 03-social-forms.md           ← SPEC-FIC: ficha social
│   │   ├── 04-projects-activities.md    ← SPEC-ATV: projetos, atividades ONE_OFF/PERIODIC
│   │   ├── 05-attendance.md             ← SPEC-FRQ: frequência
│   │   ├── 06-eligibility.md            ← SPEC-APT: aptidão familiar
│   │   ├── 07-reports.md               ← SPEC-REL: relatórios (só MVP)
│   │   ├── 08-audit.md                 ← SPEC-AUD: auditoria
│   │   └── README.md                   ← hierarquia documental e sequência MVP
│   ├── decisions/
│   │   └── ADR-001-ad-gateways.md      ✅ criado
│   ├── ERS — ERP Social Luz da Esperança.md   ← fonte de requisitos
│   ├── MODELAGEM-DO-SISTEMA.md               ← contratos lógicos D-01 a D-10
│   ├── PRD-ERP-Luz-da-Esperanca-v1.1.md      ← PRD canônico (regras de negócio)
│   └── PROJECT-CONTEXT-OPENCODE.md           ← handoff gerado pelo OpenCode
│
├── AGENTS.md                             ← instruções para agentes AI (leia antes de qualquer BUILD)
├── docker-compose.yml                    ✅
├── package.json                          ✅ (scripts na raiz)
├── tsconfig.json                         ✅
└── .env.example                          ✅
```

> **Onde adicionar novas funcionalidades:**
> - Novo módulo AD → `api/src/features/{nome}/domain|application|infrastructure|presentation`
> - Nova entidade compartilhada que AD consume → nova interface em `shared/domain/gateways/` + adapter em `shared/infrastructure/gateways/`
> - Nenhuma tabela de Family/Person/Membership/Activity/UserAccount no schema Prisma — jamais

---

## 4. Arquitetura e decisões técnicas

### Padrão de dependências externas (Ports & Adapters)

Entidades de identidade (Família, Pessoa, Membership, Atividade, Usuário) pertencem ao módulo BC do Fabrício. A frente AD acessa essas entidades **exclusivamente via interfaces de gateway** definidas em `shared/domain/gateways/`.

```
Domain (gateway interface)
        ↑
Infrastructure (in-memory adapter)   ←── substituir por adapter real quando BC entregar
```

**Por que não duplicar?** A propriedade de identidade pertence ao CAD (`docs/specs/README.md §2.1`). Fatos históricos (atendimentos, entregas) devem conservar `familyId`/`membershipId` do instante do fato — uma cópia simplificada perde esse comportamento desde o primeiro dia (`docs/specs/02-registration.md:30-32`).

### Regra de dependências — nunca violar

```
Presentation (Fastify routes + Zod)
      ↓
Application (UseCases)
      ↓
Domain (entities, VOs, repository interfaces, gateway interfaces, errors)

Infrastructure → Domain (implementa contratos — nunca o contrário)
```

**Proibido:**
- `Domain` importar Fastify, Prisma, Redis, jose, bcrypt
- `Application` importar `Infrastructure` diretamente
- `UseCase` instanciar implementação concreta
- Composition Root em qualquer lugar exceto `api/src/app.ts`

### Injeção de dependências

Por construtor, recebendo interfaces. O único lugar onde implementações concretas são instanciadas é `app.ts`.

```typescript
// correto
class RegisterServiceRecordUseCase {
  constructor(
    private readonly repository: ServiceRecordRepository,
    private readonly registry: RegistryGateway,
    private readonly activity: ActivityGateway,
  ) {}
}
```

### Autenticação

JWT (jose, HS256, exp 8h) verificado em `authenticate.middleware.ts` (Fastify preHandler). Autorização por role em `authorize.middleware.ts` (factory). Tokens nunca aparecem em logs, respostas de erro ou snapshots de auditoria.

### Aptidão familiar (EligibilityGateway)

A frente AD **não calcula aptidão** — apenas consulta o resultado via `EligibilityGateway`. A implementação atual (`PendingEligibilityGateway`) retorna sempre `PENDING`. Isso é o **comportamento correto** conforme RN-18 e LAC-01 (nenhuma política configurada = PENDING). Não é um atalho técnico.

### Banco de dados

PostgreSQL é a fonte persistente de todos os registros de negócio da frente AD. Redis é infraestrutura auxiliar (sessões se necessário). O schema Prisma contém **apenas** tabelas do domínio AD. Identidade externa vive nos gateways.

### Auditoria

Cada módulo AD tem sua própria tabela de auditoria (ex: `ServiceRecordAuditEntry`). A auditoria é gravada na **mesma transação** do fato de domínio — não em chamada separada. Campos registrados: `operation`, `performedBy`, `performedAt`, `before` (JSON), `after` (JSON), `reason`.

### Tratamento de erros

Erros de domínio são classes específicas (`extends DomainError`), cada uma com `code` único. A Presentation converte para status HTTP:

```
ServiceRecordNotFoundError        → 404
ActivityNotFoundError             → 422
ConcurrentModificationError       → 409
ServiceRecordAlreadyCanceledError → 409
FutureDateError                   → 422
```

### Dados

`DATA_MODE=SYNTHETIC` enquanto LAC-08 (uso de dados pessoais reais) estiver aberta. Fixtures usam nomes genéricos, CPFs inválidos, CEPs inexistentes.

### Nomenclatura obrigatória

| Conceito | Sufixo | Exemplo |
|---|---|---|
| Caso de uso | `UseCase` | `RegisterServiceRecordUseCase` |
| Input | `Input` | `RegisterServiceRecordInput` |
| Output | `Output` | `RegisterServiceRecordOutput` |
| Repository (interface) | `Repository` | `ServiceRecordRepository` |
| Repository (impl Prisma) | `PrismaXRepository` | `PrismaServiceRecordRepository` |
| Gateway (interface) | `Gateway` | `RegistryGateway` |
| Gateway (impl in-memory) | `InMemoryXGateway` | `InMemoryRegistryGateway` |
| Erro de domínio | `Error` | `ServiceRecordNotFoundError` |

---

## 5. Contratos e interfaces

### Gateways (shared/domain/gateways/)

#### RegistryGateway
```typescript
interface RegistryGateway {
  findFamily(familyId: string): Promise<FamilySnapshot | null>
  findFamiliesByQuery(query: string): Promise<FamilySnapshot[]>
  resolveMembership(personId: string, asOf: string): Promise<MembershipSnapshot | null>
  listActiveMemberships(familyId: string, asOf: string): Promise<MembershipSnapshot[]>
}
// MembershipSnapshot: { membershipId, familyId, personId, personName, relationship, isHolder, startDate, endDate|null, revision }
```

#### ActivityGateway
```typescript
interface ActivityGateway {
  requireOneOffActivity(activityId: string): Promise<ActivitySnapshot>
  // lança ActivityNotFoundError ou ActivityNotOneOffError
  listActiveOneOffActivities(): Promise<ActivitySnapshot[]>
}
// ActivitySnapshot: { activityId, name, nature: "ONE_OFF", serviceType: { serviceTypeId, name }, revision, isActive }
```

#### EligibilityGateway
```typescript
interface EligibilityGateway {
  evaluate(familyId: string, referenceDate: string): Promise<EligibilityAssessment>
}
// EligibilityAssessment: { assessmentId, familyId, referenceDate, evaluatedAt, status: "ELIGIBLE"|"INELIGIBLE"|"PENDING", policyId|null, pendingReason|null, evidences[] }
```

#### AuthGateway
```typescript
interface AuthGateway {
  authenticate(login: string, password: string): Promise<{ token: string; operator: AuthenticatedOperator }>
  verify(token: string): Promise<AuthenticatedOperator>
}
// AuthenticatedOperator: { accountId, name, role: "COORDINATION"|"SOCIAL_WORKER"|"ACTIVITY_MANAGER"|"STOCK_DISTRIBUTION" }
```

### ServiceRecordRepository (features/atd/domain/repositories/)
```typescript
interface ServiceRecordRepository {
  save(record: ServiceRecord, homeVisit?: HomeVisit): Promise<void>
  findById(id: string): Promise<{ record: ServiceRecord; homeVisit: HomeVisit | null } | null>
  findByFamily(familyId: string, filter?: { from?: CivilDate; to?: CivilDate }):
    Promise<Array<{ record: ServiceRecord; homeVisit: HomeVisit | null }>>
}
// save deve ser atômico: ServiceRecord + HomeVisit + AuditEntry na mesma transação Prisma
```

### Endpoints existentes

| Método | Path | Auth | Roles |
|---|---|---|---|
| GET | /health | ❌ | — |
| POST | /auth/login | ❌ | — |
| GET | /auth/me | ✅ | todas |
| GET | /admin/ping | ✅ | COORDINATION |

### Value Objects (shared/domain/value-objects/)

- `Id`: branded string, `Id.generate()` via `crypto.randomUUID()`, `Id.from(raw)`
- `CivilDate`: branded string `YYYY-MM-DD`, `CivilDate.from(raw)` com validação de formato
- `Instant`: branded string ISO-8601, `Instant.now()`, `Instant.from(date)`
- `Revision`: branded number positivo, `Revision.of(n)`

---

## 6. Fluxos importantes

### Fluxo de autenticação (implementado)

```
LoginPage (web)
  ↓ POST /auth/login { login, password }
Fastify route (auth.routes.ts)
  ↓ Zod validation
  ↓ authGateway.authenticate(login, password)
JwtAuthGateway
  ↓ busca usuário nas fixtures
  ↓ bcrypt.compare(password, hash)
  ↓ jose.SignJWT({ sub, name, role })
  ↓ retorna { token, operator }
Fastify route → 200 { token, operator }
  ↓
LoginPage salva token em localStorage
  ↓ redirect /dashboard
```

### Fluxo de autorização (implementado)

```
Fastify request (qualquer rota protegida)
  ↓ authenticate.middleware (onRequest / preHandler)
  ↓ extrai Bearer do header Authorization
  ↓ authGateway.verify(token) via jose
  ↓ decora request.operator
  ↓ authorize(['COORDINATION', ...]) preHandler
  ↓ verifica request.operator.role
  → 401 se sem token | 403 se role insuficiente | continua se autorizado
```

### Fluxo de atendimento pontual (planejado — ATD-Core)

```
Operador (web)
  ↓ POST /service-records { activityId, familyId, personId?, occurredAt, executor, note?, homeVisit? }
Fastify route
  ↓ Zod validation
  ↓ RegisterServiceRecordUseCase.execute(input)
    ↓ activityGateway.requireOneOffActivity(activityId)
    ↓ registryGateway.findFamily(familyId)
    ↓ registryGateway.resolveMembership(personId, occurredAt) se personId não null
    ↓ ServiceRecord.create(...)  ← pode lançar FutureDateError
    ↓ HomeVisit.create(...) se homeVisit fornecido
    ↓ repository.save(record, homeVisit?)  ← atômico com AuditEntry
  ↓ 201 { serviceRecordId, occurredAt, ... }
```

---

## 7. Banco de dados

### Tecnologia
PostgreSQL 16 (Prisma ORM). Redis 7 (auxiliar — sem uso de negócio implementado ainda).

### Estado atual do schema

**Models placeholder** (só `id`, `createdAt`, `updatedAt` — sem colunas de negócio):
`ServiceRecord`, `HomeVisit`, `Item`, `Category`, `Unit`, `StockReceipt`, `StockLot`, `StockMovement`, `Delivery`, `DeliveryLine`, `BazarTransfer`

**Models ausentes por decisão arquitetural** (comentário no topo do schema.prisma):
`Family`, `Person`, `FamilyMembership`, `Activity`, `UserAccount` — pertencem ao BC e são acessados via gateway.

### Migrations
⚠️ **Nenhuma migration foi executada contra banco real.** O Docker estava inativo durante a sessão. Rodar antes de qualquer próximo BUILD:
```bash
docker compose up -d
pnpm db:migrate
```

### Colunas planejadas para ATD-Core (a adicionar no próximo BUILD)

**ServiceRecord:**
```
activityId, serviceTypeId, serviceTypeName, familyId, personId?, membershipId?,
executorName, executorRole, occurredAt (Date), recordedAt (Timestamptz),
recordedBy, note?, status (COMPLETED|CANCELED), revision (Int)
```

**HomeVisit:**
```
serviceRecordId (unique FK), observedSituation
```

**ServiceRecordAuditEntry (nova tabela):**
```
serviceRecordId, operation, performedBy, performedAt, before (Json?), after (Json?), reason?
```

### Relacionamentos relevantes (planejados)

- `ServiceRecord` 1:1 `HomeVisit` (opcional)
- `ServiceRecord` 1:N `ServiceRecordAuditEntry`
- `Delivery` 1:1 `ServiceRecord` (quando ENT for implementado)

---

## 8. Testes

### Framework
**Vitest** — todos os testes em `api/src/**/__tests__/`

### Testes existentes (21/21 passando)

| Arquivo | Camada | Cenários |
|---|---|---|
| `in-memory-registry.gateway.test.ts` | Infrastructure | resolveMembership vigente/encerrado/null, listActiveMemberships |
| `in-memory-activity.gateway.test.ts` | Infrastructure | requireOneOffActivity válido/não encontrado/PERIODIC/inativo, listActiveOneOffActivities |
| `pending-eligibility.gateway.test.ts` | Infrastructure | sempre PENDING, policyId null, pendingReason não nulo |
| `jwt-auth.gateway.test.ts` | Infrastructure | authenticate válido/senha errada/login inexistente, verify válido/expirado/inválido |

### Lacunas conhecidas

- Sem testes de Domain (entidades, value objects) — serão criados em ATD-Core
- Sem testes de Application (use cases) — serão criados em ATD-Core
- Sem testes de Presentation (rotas Fastify via inject) — serão criados em ATD-Core
- Sem testes de Integration (Prisma + banco real) — dependem das migrations executadas

### Comandos

```bash
pnpm test                  # unit tests (sem banco)
pnpm test:watch            # watch mode
pnpm test:integration      # integration tests (requer docker compose up -d + pnpm db:migrate)
```

---

## 9. Comandos e ambiente

### Instalação
```bash
pnpm install
```

### Infraestrutura local
```bash
docker compose up -d       # sobe PostgreSQL (5432) e Redis (6379)
docker compose down        # derruba
```

### Banco de dados
```bash
pnpm db:migrate            # aplica migrations (requer PG rodando)
pnpm db:generate           # regenera Prisma Client após mudanças no schema
pnpm db:seed               # loga gateways in-memory (sem inserção no banco ainda)
```

### Desenvolvimento
```bash
pnpm dev:api               # Fastify na porta 3000 (tsx watch)
pnpm dev:web               # Vite na porta 5173
pnpm dev                   # ambos em paralelo (concurrently)
```

### Qualidade
```bash
pnpm typecheck             # tsc --noEmit em api/ e web/
pnpm test                  # vitest run
pnpm build:api             # tsc -p api/tsconfig.json
pnpm build:web             # vite build
```

### Variáveis de ambiente necessárias (`.env`)
```
DATABASE_URL=postgresql://erp:erp@localhost:5432/erp_social
REDIS_URL=redis://localhost:6379
APP_TIMEZONE=America/Fortaleza
JWT_SECRET=dev-secret-change-in-production
PORT=3000
DATA_MODE=SYNTHETIC
```

### Credenciais dos usuários sintéticos (fixtures)
| login | senha | role |
|---|---|---|
| `coordenacao` | `senha123` | COORDINATION |
| `assistente` | `senha123` | SOCIAL_WORKER |
| `estoque` | `senha123` | STOCK_DISTRIBUTION |

### Requisitos de ambiente
- Node.js: versão compatível com ES2022 + NodeNext modules (verificar `api/tsconfig.json`)
- pnpm: gerenciador de pacotes (sem workspaces — arquivo único na raiz)
- Docker: para PostgreSQL e Redis locais
- Prisma CLI: `npx prisma` (não instalado globalmente — usar via npx)

---

## 10. Pendências

### 🔴 Bloqueadores antes do próximo BUILD

1. **Migrations nunca executadas**: rodar `docker compose up -d && pnpm db:migrate` antes de qualquer BUILD que envolva Prisma ou banco real.

### 🟡 Decisões ainda não tomadas

2. **LAC-01** (o que conta como "frequentando"): afeta `RF-ENT-02` e `RF-ENT-06`. Sem política, toda família fica PENDING — comportamento atual é correto. Mas para ENT funcionar com famílias ELIGIBLE será necessário que Fabrício entregue o contrato real de aptidão.

3. **LAC-06** (unidades, categorias, triagem, validade, ajustes): afeta `RF-EST-01` a `RF-EST-09`. Impede definir `Unit.decimalPlaces`, `requiresExpiration`, motivos de descarte. Para EST, travar como configurável com validação estrita.

4. **LAC-07** (como o Bazar comunica a transferência): afeta `RF-BAZ-01`. `BazarTransfer.externalReference` é o campo de idempotência — formato ainda indefinido.

5. **LAC-13** (dados da visita domiciliar): afeta `RF-ATD-06`. Campo `observedSituation` é texto livre sem diagnóstico. Implementar assim — a lacuna pede confirmação do campo, não impede o desenvolvimento.

6. **Specs AD** (`docs/specs/09-service-records.md` a `12-bazar-transfer.md`): não existem ainda. O desenvolvimento da frente AD está ocorrendo sem spec formal no mesmo formato das specs do MVP.

7. **Contrato real de aptidão** (Fabrício/FRQ): quando `InMemoryActivityGateway` e `PendingEligibilityGateway` precisarem ser substituídos por implementações reais, o contrato físico precisa ser acordado entre Gabriel e Fabrício.

### 🟢 Tarefas planejadas (em ordem de dependência)

8. **ATD-Core** ← próximo BUILD (entidades, use cases, rotas, testes, colunas schema)
9. **EST** — catálogo de itens, entradas, saldo, ajustes
10. **BAZ** — recebimento do Bazar (alimenta EST)
11. **ENT** — entregas às famílias (depende de ATD + EST + contrato de aptidão)
12. **Relatórios** (RF-REL-05 e RF-REL-06) — BUILD separado após features de dados

---

## 11. Último estado / Onde paramos

**Última tarefa executada:** BUILD 1 — Fundação evolutiva (concluído pelo OpenCode).

**O que foi concluído:**
- Raiz do projeto configurada (package.json, docker-compose, tsconfig, .env.example)
- Toda a infraestrutura de `shared/` implementada: value objects, erros, gateways (interfaces + implementações in-memory), middlewares de auth, rotas de /auth
- Schema Prisma com models placeholder criado
- Frontend básico funcional (login → dashboard)
- ADR-001 registrado
- 21 testes passando, typecheck limpo

**O que ficou faltando nesta etapa:**
- Migrations contra banco real (`docker compose up -d && pnpm db:migrate`)

**Próximo passo lógico:** BUILD 2 — ATD-Core.

**Antes de iniciar o BUILD ATD-Core**, executar obrigatoriamente:
```bash
docker compose up -d
pnpm db:migrate
# verificar que as migrations aplicaram os 11 models placeholder
pnpm test  # confirmar que os 21/21 ainda passam
```

**O que o BUILD ATD-Core deve implementar:**
- `features/atd/domain/entities/`: `ServiceRecord`, `HomeVisit`
- `features/atd/domain/value-objects/`: `ExecutorInfo`
- `features/atd/domain/errors/`: 8 erros específicos de ATD
- `features/atd/application/use-cases/`: 5 use cases (Register, Cancel, CorrectNote, Get, ListByFamily)
- `features/atd/infrastructure/repositories/`: `PrismaServiceRecordRepository` com transação atômica
- `features/atd/presentation/routes/`: 5 rotas (POST, PATCH cancel, PATCH note, GET id, GET list)
- Schema Prisma: colunas reais em `ServiceRecord`, `HomeVisit` + nova tabela `ServiceRecordAuditEntry`
- Testes: domain (entidades), application (use cases com mocks), infrastructure (integração Prisma), presentation (inject Fastify)
- `ADR-002`: imutabilidade de campos de fato do atendimento

**Requisitos cobertos pelo ATD-Core:** RF-ATD-01 a 08, RN-05/08/09/20/21, AC-04/AC-16.

**Prompts PLAN e BUILD do ATD-Core** estão disponíveis na sessão de orientação técnica com Claude — solicitar ao mentor antes de iniciar.

---

## 12. Histórico de decisões

### DEC-001 — Protótipo evolutivo (não descartável)

**Decisão:** O protótipo da frente AD deve ser evolutivo — quando o BC do Fabrício entregar as entidades compartilhadas, o adapter é trocado sem reescrever persistência, IDs, histórico ou testes.

**Motivo:** Um protótipo descartável (com schema próprio para Family/Person) criaria segunda fonte de verdade, perderia o comportamento de fatos históricos (RN-09) e exigiria reescrita completa na integração.

**Alternativas consideradas:** Schema próprio marcado `prototype_*` (descartável) — recusado pelo PO/arquiteto.

**Impacto:** Toda dependência de identidade externa passa por interface de gateway. Nenhuma tabela de BC no schema Prisma.

---

### DEC-002 — Gateway pattern para dependências externas

**Decisão:** Criar interfaces de gateway em `shared/domain/gateways/` para cada dependência externa (RegistryGateway, ActivityGateway, EligibilityGateway, AuthGateway). Implementar com adapters in-memory durante o desenvolvimento da frente AD.

**Motivo:** "Uma regra tem um proprietário: CAD resolve identidade/vínculo" (docs/specs/README.md §2.1). Fatos históricos devem conservar `familyId`/`membershipId` do instante do fato (docs/specs/02-registration.md:30-32). Duplicar congela interpretação incorreta de LAC-02/DEC-01 ainda em aberto.

**Alternativas consideradas:** Duplicar entidades em schema próprio (recusado); aguardar BC do Fabrício (inviável para o prazo do protótipo).

**Impacto:** Troca de adapter sem migração de tabelas quando BC entregar.

---

### DEC-003 — PendingEligibilityGateway retorna sempre PENDING

**Decisão:** A implementação atual de `EligibilityGateway` retorna sempre `{ status: "PENDING", policyId: null }`.

**Motivo:** RN-18 define que "sem política configurada, toda família fica Pendente". LAC-01 (critério de frequência mínima) ainda está em aberto — não existe política para avaliar. Este é o **comportamento correto**, não uma limitação técnica.

**Impacto:** Toda entrega a família PENDING exigirá justificativa + autorizador (RF-ENT-06). Quando FRQ/APT entregar o contrato real, substitui-se o adapter.

---

### DEC-004 — AD como frente paralela ao MVP

**Decisão:** O AGENTS.md exclui explicitamente ATD, EST, ENT, BAZ e MIG do MVP atual. A frente AD é tratada como desenvolvimento paralelo ao invés de aguardar extensão do MVP.

**Motivo:** Inviável aguardar extensão formal do MVP para o prazo do protótipo acadêmico.

**Impacto:** Não existem specs formais (09 a 12) para os módulos AD em `docs/specs/`. O desenvolvimento usa ERS + MODELAGEM-DO-SISTEMA como fonte de requisitos, com o mesmo rigor arquitetural das specs do MVP.

---

### DEC-005 — Campos de fato do atendimento são imutáveis (planejada para ADR-002)

**Decisão:** No módulo ATD, apenas o campo `note` pode ser corrigido após registro. Os campos `familyId`, `personId`, `occurredAt`, `activityId` representam o fato histórico e não podem ser editados. O operador deve cancelar e re-registrar.

**Motivo:** RN-09 — mudanças cadastrais não transferem fatos anteriores. RN-08 — correções têm autor e motivo. Editar campos de fato transforma o sistema em editor de histórico.

**Impacto:** Apenas dois endpoints de mutação: `PATCH /service-records/:id/cancel` e `PATCH /service-records/:id/note`. `ADR-002` deve ser criado no BUILD ATD-Core.

---

### DEC-006 — Feature First + Clean Architecture + DDD (baseado em AGENTE-NEXT)

**Decisão:** Aplicar os princípios de Feature First, Clean Architecture (4 camadas), DDD e SOLID em toda a codebase, adaptando o padrão do `AGENTE-NEXT.txt` (originalmente para Next.js) para o stack Fastify.

**Mapeamento de adaptações:**
- `app/api/route.ts` → Fastify route handler em `presentation/routes/`
- Server Actions → não existem (rota chama UseCase diretamente)
- Server/Client Components → não existem (SPA React Router)
- Middleware → Fastify `preHandler` hook

**Impacto:** Nomenclatura rígida (UseCase, Input, Output, Repository, Gateway). Domain sem imports externos. Composition Root exclusivo em `app.ts`.

---

## 13. Como continuar o desenvolvimento

### O que verificar primeiro

1. Leia `AGENTS.md` — define stack, convenções e escopo vigente do MVP.
2. Leia `docs/specs/README.md` — hierarquia documental e sequência de implementação.
3. Verifique que `docker compose up -d && pnpm db:migrate` já foi executado e as migrations estão aplicadas.
4. Rode `pnpm test` — confirme 21/21 passando antes de qualquer alteração.

### O que entender antes de alterar

- **`shared/domain/gateways/`**: são os contratos com o mundo externo. Qualquer feature AD depende dessas interfaces. Não altere sem entender o impacto em todos os use cases.
- **`app.ts` (Composition Root)**: é o único lugar onde implementações concretas são conectadas. Ao criar um novo UseCase, ele deve ser instanciado aqui.
- **`api/prisma/schema.prisma`**: o comentário no topo explica por que Family/Person/Activity/UserAccount não existem. Não adicione essas tabelas.

### Quais arquivos são importantes ler antes de implementar ATD-Core

```
docs/ERS — ERP Social Luz da Esperança.md     → §3.2.6 (RF-ATD), §3.7 (RN), Apêndice A (AC)
docs/MODELAGEM-DO-SISTEMA.md                  → D-05 (entidades de atendimento)
docs/specs/02-registration.md                 → contratos de membership que ATD consome
docs/specs/04-projects-activities.md          → ONE_OFF vs PERIODIC, ServiceType
docs/decisions/ADR-001-ad-gateways.md         → por que não duplicar entidades
api/src/shared/domain/gateways/               → interfaces que os use cases de ATD usam
api/src/shared/infrastructure/gateways/       → implementações in-memory atuais (fixtures)
api/src/app.ts                                → como injetar novo UseCase no Composition Root
```

### Restrições que não devem ser revertidas sem discussão

- ❌ Não adicionar tabelas de `Family`, `Person`, `Membership`, `Activity`, `UserAccount` no schema Prisma
- ❌ Não importar Prisma, Fastify ou libs externas no Domain
- ❌ Não instanciar implementações concretas fora de `app.ts`
- ❌ Não implementar cálculo de aptidão na frente AD (pertence à frente FRQ do Fabrício)
- ❌ Não implementar RF-ATD-09 (agendamento — Desejável, LAC-04 em aberto)
- ❌ Não editar campos de fato (`familyId`, `personId`, `occurredAt`, `activityId`) de atendimento já registrado

### Próxima tarefa

**BUILD 2 — ATD-Core** (RF-ATD-01 a 08).

Prompts de PLAN e BUILD completos foram gerados na sessão de orientação técnica com Claude. Solicitar ao mentor (Claude) para recuperar ou regenerar o prompt de BUILD antes de iniciar — o PLAN já foi elaborado detalhadamente com todos os cenários de teste, schema proposto e fluxo de use cases.

**Ordem de desenvolvimento recomendada após ATD-Core:**
```
ATD-Core → EST (catalog + receipt) → EST (balance + adjustment) → BAZ → ENT
```
ENT deve ser o último: depende de ATD + EST + contrato real de aptidão (Fabrício).
