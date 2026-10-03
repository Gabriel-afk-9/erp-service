# Project Context

> Documento de continuidade técnica do projeto.
> Este arquivo deve ser atualizado ao final de cada etapa relevante de desenvolvimento.

**Última atualização:** 2026-10-03
**Estado:** FASE 1 (ATD) ✅ CONCLUÍDA — ATD-Core + tela web, validados com banco
**Último ponto alcançado:** FASE 1 encerrada (65 testes unitários + 6 integração = 71 verdes); alinhamento documental concluído (specs 09–12, ROADMAP-AD)

## 1. Visão geral

**Objetivo:** ERP Social da instituição Luz da Esperança — acompanhar pessoas assistidas e famílias, atividades, frequência, aptidão, atendimentos pontuais, estoque social e entregas.

**Escopo deste protótipo:** frente AD (Atendimentos e Doações) — módulos ATD, EST, ENT, BAZ. As frentes BC (CAD, FIC, ATV, REL, ACS, MIG) e FRQ (FRQ, APT) são de outras equipes; este repo **consome** BC/FRQ via interfaces e **não implementa** esses módulos.

**Stack:** TypeScript, Node.js 22, Fastify 5, Zod 3, Prisma 6 + PostgreSQL 16, Redis 7, `jose` (JWT), `bcrypt`, Vitest 3, React 19 + Tailwind + React Router (SPA). Gerenciador: pnpm 11. Versões pinadas sem `^`.

**Arquitetura:** backend monolítico modular; Feature First + Clean Architecture em 4 camadas (`domain → application → infrastructure → presentation`) + DDD dentro de cada feature em `api/src/features/<feature>/`.

## 2. Estado atual

### Implementado e validado (com banco)
- **Fundação:** gateways + implementações in-memory com dados sintéticos, middlewares de auth, rotas de auth, Composition Root, fixtures (5 famílias, 10 pessoas, 3 atividades ONE_OFF ativas + 1 encerrada, 3 usuários).
- **ATD-Core completo (FASE 1 ✅):** entidades `ServiceRecord`/`HomeVisit`, 5 UseCases, `PrismaServiceRecordRepository`, 5 rotas, `homeVisit`/`hasHomeVisit` nos outputs de get/list, 65 testes unitários + 6 integração passando, `tsc` limpo em api e web, `vite build` OK, smoke test via `inject` OK (incluindo doação → 422).
- **Tela web `/attendance`:** formulário de registro + lista por família + modal de cancelamento (`web/src/features/atd/`); proxy `/service-records` no Vite; card ATD do dashboard vira link.
- **Docs de decisão:** `docs/decisions/ADR-001-ad-gateways.md`, `ADR-002-atd-fact-immutability.md`.
- **Alinhamento documental:** `AGENTS.md` redefinido para a frente AD; specs 09–12 (ATD/EST/ENT/BAZ) criadas; `docs/ROADMAP-AD.md` (FASE 0–6); traceability realinhada; cabeçalhos de escopo nas specs 01/03/04/05/06/07. Auditoria em `docs/audits/PROJECT-ALIGNMENT-AUDIT.md`.

### Parcialmente implementado
- `api/src/features/{inventory,deliveries,bazar}/`: só `placeholder.ts` — nenhum UseCase, entidade ou rota.
- `api/prisma/schema.prisma`: `ServiceRecord`, `HomeVisit`, `ServiceRecordAuditEntry` com colunas reais; demais models (`Category`, `Unit`, `Item`, `StockReceipt`, `StockLot`, `StockMovement`, `Delivery`, `DeliveryLine`, `BazarTransfer`) ainda placeholders.

### Não implementado
- EST/ENT/BAZ comportamentos (scaffold + tabelas stub), relatórios REL-05/06, CAD (FASE 2 — próximo passo), aptidão real (contrato FRQ pendente).
- `GET /families` e `GET /service-types` — frontend usa TODOs com valores fixos até a FASE 2.
- Setup automático, `docs/PROJECT-CONTEXT.md`, `setup-matt-pocock-skills` (interativo, pendente).

### Placeholders / mocks / adapters em memória
- `InMemoryRegistryGateway`, `InMemoryActivityGateway`, `PendingEligibilityGateway` (sempre `PENDING`, conforme RN-18), `JwtAuthGateway` sobre fixtures. Troca por adapters reais não deve alterar `domain`/`application`.

## 3. Estrutura do projeto

```text
api/src/
  app.ts                          # Composition Root (único lugar que instancia concretos)
  index.ts                        # entry point (listen)
  features/atd/                   # único módulo de negócio implementado
    domain/entities|errors|repositories|value-objects/
    application/use-cases/<caso>/{*.input,*.output,*.use-case}.ts
    infrastructure/repositories/prisma-*.ts
    presentation/routes/*.routes.ts
  features/{inventory,deliveries,bazar}/  # placeholders (só placeholder.ts)
  shared/
    domain/{value-objects (Id,CivilDate,Instant,Revision),errors,gateways}/
    application/errors/           # ApplicationError base
    infrastructure/{database (prisma client),cache (redis),gateways (in-memory + fixtures)}/
    presentation/{middleware (authenticate,authorize),routes (auth.routes)}/
api/prisma/{schema.prisma,seed.ts}  # seed só faz log, não escreve no banco
web/src/                          # SPA: LoginPage, AttendancePage, service-records.api, api-client, PrivateRoute, Layout, DashboardPage
```

Novas funcionalidades (EST/ENT/BAZ) seguem o molde de `features/atd/`. Novas dependências externas entram como gateway em `shared/domain/gateways/` + adapter in-memory.

## 4. Arquitetura e decisões técnicas

- **Regra de dependências (nunca violar):** presentation → application → domain; infrastructure → domain (implementa contratos). Domain não importa Fastify, Prisma, Redis, jose, bcrypt nem qualquer lib externa. UseCases recebem interfaces no construtor.
- **Boundaries:** AD não cria `Family`, `Person`, `Activity`, `UserAccount` — persistem-se apenas IDs opacos + snapshots imutáveis (`serviceTypeName`, vínculo do fato). Ver ADR-001.
- **Fato histórico:** `occurredAt` (data civil do fato, `CivilDate`) ≠ `recordedAt` (instante do lançamento, servidor). Lançamento tardio permitido; fato futuro rejeitado.
- **Concorrência:** `revision` (inicia em 1, incrementa por mutação); escrita condicional no banco; divergência → 409.
- **Auth:** JWT HS256 (`jose`) + `verify` no middleware global; `authorize([...roles])` por rota. Operador (`recordedBy`) ≠ executor físico (`executorName`/`executorRole`, que pode não ter conta).
- **Auditoria ATD:** `ServiceRecordAuditEntry` (`CREATED|CANCELED|NOTE_CORRECTED`, `before/after/reason/performedBy`), gravada na mesma transação do fato.
- **Testes:** Vitest; unidade com fakes em `__tests__/`; integração só com PG real (`*.integration.test.ts`, excluído do run unitário no `vitest.config.ts`).
- **Restrições:** código em inglês (UI em pt-BR); sem `throw new Error` genérico no domínio; sem `DELETE` de fatos; texto livre sem conteúdo clínico.

## 5. Contratos e interfaces

**Gateways (`shared/domain/gateways/`):** `RegistryGateway` (`findFamily`, `findFamiliesByQuery`, `resolveMembership(personId,asOf)`, `listActiveMemberships`), `ActivityGateway` (`requireOneOffActivity`, `listActiveOneOffActivities`), `EligibilityGateway` (`evaluate` → sempre `PENDING` no adapter atual), `AuthGateway` (`authenticate`, `verify`). Papéis: `COORDINATION`, `SOCIAL_WORKER`, `ACTIVITY_MANAGER`, `STOCK_DISTRIBUTION`.

**Entidades ATD:** `ServiceRecord` (`activityId`, `serviceTypeId`, `serviceTypeName` snapshot, `familyId`, `personId?`, `membershipId?`, `executor`, `occurredAt`, `recordedAt`, `recordedBy`, `note?` ≤500, `status COMPLETED|CANCELED`, `revision`) — pessoa `null` = família toda; `HomeVisit` (`serviceRecordId` 1:1, `observedSituation`).

**Rotas ATD** (`service-record.routes.ts`, Zod `.strict()`):
| Rota | Acesso | Sucesso | Erros |
|---|---|---|---|
| `POST /service-records` | COORD, SOCIAL, STOCK | 201 | 400 validação; 422 (atividade, família, vínculo, data futura, visita, doação direta); 401/403 |
| `PATCH /service-records/:id/cancel` | COORD, SOCIAL | 200 | 404; 409 (revisão, já cancelado) |
| `PATCH /service-records/:id/note` | COORD, SOCIAL | 200 | 404; 409 |
| `GET /service-records/:id` | COORD, SOCIAL, STOCK | 200 (inclui `homeVisit`) | 404 |
| `GET /service-records?familyId=&from?=&to?` | COORD, SOCIAL, STOCK | 200 (itens com `hasHomeVisit` + `homeVisit`) | 400 |

Regras: visita exige `serviceType.code === "HOME_VISIT"` + `homeVisit` (e vice-versa); tipo `ITEM_DONATION` só via entrega (futura ENT) — `DonationTypeNotAllowedError` (definido no arquivo do UseCase de registro); só `note` é corrigível, demais campos de fato são imutáveis (ADR-002: cancelar + re-registrar).

## 6. Fluxos importantes

```text
Login:  SPA → POST /auth/login → JwtAuthGateway (bcrypt+jose) → { token, operator }
        SPA guarda token (localStorage, protótipo) → api-client injeta Bearer
Registro: POST /service-records → auth hook → authorize → Zod →
        RegisterServiceRecordUseCase → ActivityGateway → RegistryGateway →
        ServiceRecord.create → Prisma.$transaction (ServiceRecord+HomeVisit+Audit) → 201
Cancel/note: rota → findById → confere revision (409) → muta entidade →
        save transacional com before/after → 200
```

## 7. Banco de dados

PostgreSQL via Prisma; Redis só para sessões/cache futuro (não usado por ATD). Tabelas reais: `ServiceRecord` (índices `[familyId,occurredAt desc]`, `[personId]`), `HomeVisit` (1:1), `ServiceRecordAuditEntry` (índice `serviceRecordId`). `occurredAt @db.Date`, `recordedAt @db.Timestamptz`. Referências externas ao BC (`activityId`, `serviceTypeId`, `familyId`, `personId`, `membershipId`, `recordedBy`, `performedBy`) são `Text` (DEC-009); só `id`s do domínio são `@db.Uuid`. Migrations aplicadas: `init`, `external-ids-to-text`. Concorrência via `updateMany({ where: { id, revision: N-1 } })`.

## 8. Testes

Vitest 3. Unitários (sem banco): 3 domínio ATD (entidade, visita, executor) + 3 aplicação (register 11 casos incl. AC-04, cancel, correct-note) + 1 apresentação (13 casos via `inject` com fakes, incl. doação → 422, get/list com `homeVisit`) + 4 legados de gateways = **65 passando**. Integração: `prisma-service-record.repository.integration.test.ts` (6 casos, PG real) — **6/6 passando**. Total: **71 testes verdes**. Comandos: `pnpm test` (unit), `pnpm test:integration` (exige PG + `DATABASE_URL` no shell).

## 9. Comandos e ambiente

Node 22.20, pnpm 11.4 (sem pin em `engines`/`packageManager` — pendente). Preparo: `scripts/setup.ps1` (idempotente, rodado da raiz do repo; verifica ferramentas, instala deps por pacote, cria `api/.env` sem sobrescrever, `compose up -d`, `generate` — tolerado se bloqueado pelo backend em execução, `migrate dev --name init` na primeira vez / `deploy` depois, `db:seed`, valida com `SELECT 1`). Backend/frontend sobem manualmente (`pnpm --dir api dev`, `pnpm --dir web dev`). `allowBuilds` (bcrypt, esbuild, prisma) no `pnpm-workspace.yaml` permite install não-interativo. (verifica ferramentas, instala deps por pacote, cria `api/.env` sem sobrescrever, `compose up -d`, `generate`, `migrate dev --name init` na primeira vez / `deploy` depois, `db:seed`, valida com `SELECT 1`). `allowBuilds` (bcrypt, esbuild, prisma) no `pnpm-workspace.yaml` permite install não-interativo. Comandos validados: `tsc --noEmit -p tsconfig.json` (api e web), `vitest run`, `prisma generate`, `tsx prisma/seed.ts` (só log), `docker compose up -d` (não executável aqui — daemon inativo). `db:migrate` nunca executado. `.env` não existe; só `api/.env.example` (fonte única ao lado do consumidor — o Prisma CLI lê `api/.env`).

## 10. Pendências

### Bloqueadores
- **Contrato real de aptidão (FRQ/Fabrício):** ENT-02/06 aguardam; `PendingEligibilityGateway` (sempre PENDING) é o comportamento correto até lá.
- **LAC-07/DEC-07 (Bazar), DEC-08/LAC-08 (dados reais):** abertas — protótipo mantém `DATA_MODE=SYNTHETIC`.

### Bugs conhecidos
- Nenhum aberto. Corrigidos no encerramento da FASE 1: `DonationTypeNotAllowedError`/`ExecutorInfoInvalidError` sem mapeamento em `toStatusCode` (caíam em 500, agora 422 — verificado via inject contra app real) e `void eligibility` removido de `app.ts` (comentário registra injeção futura em ENT/FASE 5). `api/src/features/atd/application/use-cases/placeholder.ts` é resíduo do scaffold (pode remover).

### Decisões ainda não tomadas
- Pin de Node/pnpm (`engines`, `packageManager`, `.nvmrc`).
- **Decisão vigente: setup automático implementado** (`scripts/setup.ps1` + `pnpm setup`; ver §9 e README). Estratégia de `dotenv` na API ainda aberta (runtime exige `DATABASE_URL` no shell).
- Perfis definitivos das rotas ATD (matriz atual é proposta do protótipo; ACS real é da frente BC).
- Idempotência de `POST /service-records` via `Idempotency-Key` (só re-cancelamento foi definido: sempre 409).

### Tarefas planejadas
- **FASE 2 — CAD (próximo passo):** RF-CAD-01–11 (Family, Person, FamilyMembership com vigência, busca, duplicidades; `PrismaRegistryGateway` substituindo o in-memory). Depois: EST (FASE 3), BAZ (FASE 4), ENT (FASE 5), REL + refinamento ACS (FASE 6). Ver `docs/ROADMAP-AD.md`.
- `setup-matt-pocock-skills` (interativo, pendente).

## 11. Último estado / Onde paramos

**Última tarefa:** encerramento da FASE 1 (ATD) — `homeVisit`/`hasHomeVisit` nos outputs de get/list, 4 novos testes, tela web `/attendance` (registro + lista + cancelamento), proxy `/service-records` no Vite, `toStatusCode` completado (doação/executor → 422), `void eligibility` removido do `app.ts`, FASE 1 marcada como concluída no ROADMAP. Nenhum arquivo de código alterado nesta tarefa de documentação.

**Estado do código:** FASE 1 ✅ CONCLUÍDA e validada **com banco** (typecheck limpo api+web, 65/65 unitários, 6/6 integração, `vite build` OK, migrations `init` + `external-ids-to-text` aplicadas). Banco local `erp_social` contém apenas resíduos de teste já limpos (0 linhas em `ServiceRecord`).

**Próximo passo:** FASE 2 — CAD (RF-CAD-01–11).

## 12. Histórico de decisões

### DEC-001 — Dependências externas via gateways (= ADR-001)
**Decisão:** `Registry/Activity/Eligibility/AuthGateway` como interfaces; adapters in-memory com sintéticos. **Motivo:** identidade pertence ao BC; duplicar criaria segunda fonte de verdade (LAC-02/DEC-01 abertos). **Impacto:** trocar adapter sem alterar domain/application.

### DEC-002 — Campos de fato imutáveis (= ADR-002)
**Decisão:** só `note` é corrigível; resto exige cancelar + re-registrar. **Motivo:** RN-08/RN-09, D-05 (fato/data/família são evidência). **Impacto:** sem PATCH de família/pessoa/data/atividade.

### DEC-003 — Coerência visita/doação por `serviceType.code`
**Decisão:** comparar `code` (`HOME_VISIT`, `ITEM_DONATION`), não o nome. **Motivo:** código estável, label pt-BR mutável. **Impacto:** mesmo comportamento com fixtures atuais.

### DEC-004 — `FamilyNotFoundError` próprio → 422
**Decisão:** erro dedicado em vez de reutilizar `ActivityNotFoundError`. **Motivo:** clareza; família inexistente é regra de negócio. **Impacto:** `code: FAMILY_NOT_FOUND`.

### DEC-005 — Tipo doação rejeitado no ATD
**Decisão:** `DonationTypeNotAllowedError` → 422 (D-05: doação só via entrega). **Impacto:** POST direto com tipo doação falha; ENT criará esse `ServiceRecord`.

### DEC-006 — Auditoria como parâmetro do `save`
**Decisão:** `save(record, homeVisit, audit)` leva motivo/autor/operação. **Motivo:** RN-08 exige autor/motivo na mesma transação. **Impacto:** interface do repositório carrega `ServiceRecordAuditInput`.

### DEC-007 — Re-cancelamento sempre 409
**Decisão:** sem caminho idempotente-200 para cancelar cancelado. **Motivo:** simplicidade do protótipo. **Impacto:** pode rever com `Idempotency-Key` no futuro.

### DEC-008 — Skills fora do git
**Decisão:** `.agents/skills/` no `.gitignore`; `skills-lock.json` como fonte de reinstalação. **Motivo:** artefato instalável, como `node_modules`.

### DEC-009 — Referências externas como Text, não UUID
**Decisão:** `activityId`, `serviceTypeId`, `familyId`, `personId`, `membershipId`, `recordedBy`, `performedBy` são `Text` no banco e `z.string().min(1)` (não `.uuid()`) nos schemas Zod das rotas; só os `id` gerados pelo domínio (`ServiceRecord`, `HomeVisit`, `ServiceRecordAuditEntry` + FKs) são `@db.Uuid`. **Motivo:** IDs do BC são opacos (`"fam-001"`, `"act-medical"`, `"usr-001"`) e quebravam todo `create` com banco real (migration `external-ids-to-text`) e todo POST com 400. **Impacto:** nenhum código de domínio/aplicação mudou (repositório já trata tudo como `string`); ciclo 201 → lista → cancel 200 → re-cancel 409 validado fim a fim com banco.

## 13. Como continuar o desenvolvimento

1. **Verifique primeiro:** `git status`, `tsc --noEmit` (api e web), `vitest run` em `api/` — tudo deve estar verde sem Docker.
2. **Entenda antes de alterar:** `api/src/app.ts` (wiring) → `features/atd/.../register-service-record.use-case.ts` (fluxo canônico) → `domain/entities/service-record.entity.ts` (invariantes).
3. **Arquivos importantes:** `api/prisma/schema.prisma`, `shared/domain/gateways/*`, `docs/decisions/ADR-*.md`, `docs/ERS — ERP Social Luz da Esperança.md` (§3.2.6–3.2.9), `docs/MODELAGEM-DO-SISTEMA.md` (D-05–D-08).
4. **Restrições invioláveis:** regra de dependências (§4); Composition Root só em `app.ts`; nada de `Family/Person/Activity` no schema; fatos sem `DELETE`; erros de domínio específicos.
5. **Não reverta sem discussão:** DEC-001–DEC-009, comparação por `code`, auditoria transacional.
6. **Próxima tarefa:** FASE 2 — CAD (ver `docs/ROADMAP-AD.md` e SPEC futura; gateway atual é sintético).
