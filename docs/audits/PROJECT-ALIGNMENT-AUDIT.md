# Project Alignment Audit — frente AD

Data da auditoria: 04/10/2026 (atualização da auditoria de 03/10/2026).
Fonte da verdade: documentos oficiais do repositório (PRD, ERS, modelagem, specs, ADRs, AGENTS.md).
O código foi tratado como evidência, nunca como referência. Nenhum requisito foi inventado; o não confirmável está marcado como `NÃO VERIFICÁVEL`.

## 1. Resumo executivo

O protótipo implementa a frente AD (equipe de Gabriel): CAD, ACS, ATD, EST, ENT, BAZ e REL-05/06. FIC, ATV-PERIODIC, FRQ, APT e MIG pertencem ao repositório FRQ (Fabrício) e valem aqui apenas via contrato de gateway.

Estado real verificado no código:

- FASE 0 (fundação) concluída. FASE 1 (ATD) concluída: RF-ATD-01/02/03/04/05/07/08 implementados, RF-ATD-06 parcial.
- FASE 2 (CAD) em andamento e é a principal novidade desde a auditoria anterior (que marcava CAD como "não iniciado"): o núcleo de família, pessoa e vínculo existe e funciona — RF-CAD-01/03/11 implementados; RF-CAD-02/04/05/06/08/09 parciais; RF-CAD-07/10 não implementados.
- FASE 3 (EST), FASE 4 (BAZ), FASE 5 (ENT) seguem em scaffold: tabelas `id/timestamps` sem comportamento, sem rotas, sem testes.
- ACS/AUD parciais com divergências declaradas (transporte Bearer+localStorage vs cookie+Redis; papéis divergentes). RF-ACS-01–07 seguem como dívida técnica (fora do escopo da FASE 6). REL-05/06 implementados na FASE 6 (relatórios de leitura sobre EST/ENT; `queryFingerprint` simplificado, fingerprint por revisão individual como evolução).
- Testes: 13 arquivos, 82 casos `it`, todos no backend; zero no frontend. Cobrem bem ATD e mapeamento HTTP CAD/ATD, mas não cobrem use-cases CAD de aplicação, matriz de autorização, idempotência, concorrência real ou contratos futuros.

Divergência central antiga (D1: código AD vs documentos MVP/FRQ) continua resolvida. Restam D2 (auth transporte), D3 (papéis) e novas divergências CAD documentadas abaixo.

## 2. Documentos analisados

| Documento | Propósito | RFs/decisões | Classe |
| --- | --- | --- | --- |
| `AGENTS.md` | Governança máxima: escopo AD, hierarquia PRD > ERS > modelagem, stack, invariantes | Escopo CAD/ACS/ATD/EST/ENT/BAZ/REL-05/06; fora FIC/ATV-PERIODIC/FRQ/APT/MIG; DEC/LAC não são aprovação | NORMATIVO |
| `docs/specs/README.md` | Índice normativo, propriedade por módulo, MVP-D01–D07, sequência, aceite | MVP-D01 aptidão configurável, D02 blocos sensíveis desativados, D03 4 perfis, D04 1 família vigente, D05 1 instituto/projeto, D06 ENROLLMENT_OR_RECORDED, D07 cobertura versionada; aceite AC-04/16 ATD, AC-11 EST, AC-05/06/10 ENT, AC-07 BAZ | NORMATIVO |
| `docs/specs/00-foundation.md` | Contratos transversais: tipos, datas, HTTP/envelope, transações, idempotência, DATA_MODE | ERS IU-01–07, INT-04; Id/Revision/CivilDate/Instant/Money, OperationRecord, serializable ≤3 retries | NORMATIVO transversal |
| `docs/specs/01-access.md` | Auth, contas, 4 perfis, matriz, JWT+jose cookie HttpOnly + sessão Redis | RF-ACS-01/02/03/06, RNF-SEG; cabeçalho declara dívida Bearer/localStorage e papéis divergentes | NORMATIVO AD (contrato prevalece sobre código) |
| `docs/specs/02-registration.md` | Pessoas, famílias, vínculos, titularidade, busca, MISSING_DATA/POSSIBLE_DUPLICATE, unificação, tamanhos | RF-CAD-01–11; CAD-AC01–18 | NORMATIVO AD |
| `docs/specs/03-social-forms.md` | Ficha versionada, seleção campo a campo, blocos sensíveis | RF-FIC-01/02/04–09 | EXTERNO (FRQ); aqui só leitura via SocialFormGateway p/ RF-ENT-02 |
| `docs/specs/04-projects-activities.md` | Institutos, projetos, atividades, inscrições | RF-ATV-01–08 | PARCIAL: só ONE_OFF via ActivityGateway é normativo aqui |
| `docs/specs/05-attendance.md` | Encontros, marcações PRESENT/ABSENT, cobertura | RF-FRQ-01–04/06/07 | EXTERNO (FRQ); relevante: ATD não é presença |
| `docs/specs/06-eligibility.md` | Política versionada, evaluate 3 valores, evidências | RF-APT-01–07 | EXTERNO; só contrato EligibilityGateway; Pending sempre PENDING está correto |
| `docs/specs/07-reports.md` | Históricos, snapshot consistente, queryFingerprint | RF-REL-05/06 dentro; demais fora | NORMATIVO parcial |
| `docs/specs/08-audit.md` | Autoria, revisões, snapshots, proteção, reconstrução | RF-ACS-04/05/06 autoria | NORMATIVO transversal |
| `docs/specs/09-service-records.md` | Atendimento pontual, visita, cancelamento/correção | RF-ATD-01–08 | NORMATIVO AD |
| `docs/specs/10-inventory.md` | Catálogo, entradas, triagem, saldo, ajustes, contagens | RF-EST-01–10 | NORMATIVO AD (scaffold) |
| `docs/specs/11-deliveries.md` | Entrega atômica, aptidão via gateway, reversão | RF-ENT-01–07 | NORMATIVO AD (scaffold) |
| `docs/specs/12-bazar-transfer.md` | Referência única, conferência, BAZAR_IN | RF-BAZ-01–04 | NORMATIVO AD (scaffold) |
| `docs/specs/traceability.md` | Rastreio 101 RFs (7+1+21+20+4+48) | Todos os RFs ERS | PLANEJAMENTO, não normativo |
| `docs/ROADMAP-AD.md` | Sequência FASE 0–6, dependências, bloqueadores | FASE 0/1 concluídas; 2 CAD, 3 EST, 4 BAZ, 5 ENT, 6 REL+ACS | PLANEJAMENTO vigente |
| `docs/PRD-ERP-Luz-da-Esperanca-v1.1.md` | Referência canônica de negócio (CAP, RN, AC, DEC) | CAP-01–12, RN-01–17, AC-01–13, DEC-01–11 | NORMATIVO canônico |
| `docs/ERS — ERP Social Luz da Esperança.md` | Detalhe de requisitos (101 RFs, RN, LAC, EVO) | RF-CAD/FIC/ATV/FRQ/APT/ATD/EST/ENT/BAZ/REL/MIG, LAC-01–13 | NORMATIVO detalhado, subordinado ao PRD |
| `docs/MODELAGEM-DO-SISTEMA.md` | Contratos lógicos D-01–D-10 | D-01 cadastro, D-05 atend.+estoque, D-06 lote, D-07 entrega, D-08 recebimento, D-10 auditoria | NORMATIVO (lógico) |
| `docs/ficha_cadastro_familias_2025.md` | Transcrição da ficha papel | Fonte FIC-01/02/04–09 | FONTE, não normativa (presença ≠ obrigatoriedade digital) |
| `docs/decisions/ADR-001-ad-gateways.md` | Gateways como interfaces, adapters in-memory sintéticos | RN-18/LAC-01 | NORMATIVO técnico |
| `docs/decisions/ADR-002-atd-fact-immutability.md` | Fato imutável; só note via PATCH | RF-ATD-07 | NORMATIVO técnico |
| `docs/context/PROJECT-CONTEXT-*.md`, Bibliografia, Pesquisa documental | Continuidade, fundamentação, comparativo | Nenhum RF novo | CONTEXTO |
| `sandbox.md` | Scratch vazio | — | NADA normativo |

## 3. Escopo do protótipo (frente AD)

1. Cadastro de pessoas, famílias e vínculos (CAD) — FASE 2, em andamento (núcleo funcional).
2. Acesso, perfis e auditoria (ACS/AUD) — parcial (login JWT + auditoria local ATD/CAD).
3. Atendimentos pontuais + visita domiciliar (ATD) — concluído (FASE 1), com ATD-06 parcial.
4. Estoque social e entregas (EST/ENT) — scaffold (FASE 3/5).
5. Recebimento do Bazar (BAZ) — scaffold (FASE 4).

Fora deste repositório: FIC, ATV-PERIODIC, FRQ, APT, MIG (FRQ/Fabrício); financeiro, CRM, vendas, contábil, prontuário clínico, Escola Espírita, voluntários/RH próprios.

## 4. Estado atual (código verificado)

- Backend: `api/src/features/atd/` completo (5 use-cases, 5 rotas, 2 entidades, 1 VO); `api/src/features/registration/` com núcleo real (10 use-cases: create-family, register-person, add-family-member, end-family-membership, correct-family, correct-person, search-families, search-persons, get-family, get-person; 3 entidades; VOs cpf/postal-code/family-code; 3 repositórios Prisma + UoW + code generator; 2 arquivos de rotas); `inventory/`, `deliveries/`, `bazar/` = `placeholder.ts`; `shared/` com Registry (Prisma real), Activity (in-memory), Eligibility (pending), Auth (JWT fixture).
- Composition Root: `api/src/app.ts` monta PrismaRegistryGateway, InMemoryActivityGateway, JwtAuthGateway, repos, UoW, codeGenerator e registra rotas auth/families/persons/service-records. Sem rotas EST/ENT/BAZ/REL/audit.
- Banco: `Family`, `Person`, `FamilyMembership`, `AuditEntry`, `ServiceRecord` + `HomeVisit` 1:1 + `ServiceRecordAuditEntry` reais; `Category/Unit/Item/StockReceipt/StockLot/StockMovement/Delivery/DeliveryLine/BazarTransfer` stubs (`id/timestamps`); 3 migrations (`init`, `external_ids_to_text`, `add_registration_module` com `family_code_seq` e índices parciais).
- Frontend: login + dashboard + `/attendance` (registro + lista + cancelamento) + CAD (`/families`, `/families/new`, `/families/:id`, `/persons/new`); proxy Vite p/ families/persons/memberships/admin; sem páginas EST/ENT/BAZ/reports/audit.
- Testes: 13 arquivos, 82 `it`, backend apenas; typecheck limpo relatado no histórico (api+web).

## 5. Matriz de requisitos

Legenda: IMPLEMENTADO = comportamento + persistência + rota + teste. PARCIAL = existe mas incompleto/divergente. PREPARADO = scaffold sem comportamento. NÃO IMPLEMENTADO = nada.

| RF | Veredito | Evidência |
| --- | --- | --- |
| ATD-01 registro | IMPLEMENTADO | `POST /service-records` + `RegisterServiceRecordUseCase` |
| ATD-02 pessoa vinculada | IMPLEMENTADO (gateway; CAD real agora substitui fixture) | `resolveMembership` na data do fato via `PrismaRegistryGateway` |
| ATD-03 família sem membro | IMPLEMENTADO | `personId` opcional (`service-record.entity.ts`, `schema.prisma`) |
| ATD-04 ocorrências por data, sem presença | IMPLEMENTADO | Sem conceito de presença no módulo |
| ATD-05 observação curta | IMPLEMENTADO | `note` ≤500, sem campos clínicos |
| ATD-06 visita domiciliar | PARCIAL | `HomeVisit` existe e é exposta em get/list + `hasHomeVisit`; UI desacoplada (checkbox independente de activityId gera 422 evitável); LAC-13 aberta |
| ATD-07 corrigir/cancelar c/ motivo | IMPLEMENTADO com ressalvas | Rotas + auditoria transacional; falta Idempotency-Key, snapshot parcial |
| ATD-08 executor nome+função | IMPLEMENTADO | `ExecutorInfo` |
| ATD-09 agendamento | NÃO IMPLEMENTADO | Desejável (LAC-04) |
| CAD-01 família + código único | IMPLEMENTADO | `CreateFamilyUseCase`, `PrismaFamilyCodeGenerator` (`family_code_seq`, 6 dígitos), `POST/GET/PATCH /families` |
| CAD-02 pessoa | PARCIAL | Núcleo ok (só name obrigatório); divergente: `sex` enum vs texto livre SPEC, CPF exige DV vs só normalizar, `correct-person` não corrige birthDate/sex/cpf/rg |
| CAD-03 vínculo | IMPLEMENTADO | `RegisterPerson` + `AddFamilyMember` transacionais, `PersonAlreadyMember/HolderAlreadyExists`, `Family.revision` |
| CAD-04 titular + troca com histórico | PARCIAL | Indicação + unicidade + histórico ok; falta troca dedicada (`reference-changes`); troca exige closure+add em 2 transações, sem atomicidade/motivo no add |
| CAD-05 encerrar/mudar sem apagar; fatos conservam família | PARCIAL | Closure com motivo/revision/auditoria ok; `ServiceRecord` guarda familyId/membershipId; falta transfer atômico, reconciliação preview/confirm, `409 DOMAIN_CONFLICT` |
| CAD-06 busca prévia parecidos | PARCIAL | Busca sem acento/caixa + paginação existe; falta birthDate, ordenação normativa, `GET /duplicate-candidates`, `duplicateReview`, `DataQualityIssue POSSIBLE_DUPLICATE` |
| CAD-07 unificação autorizada | NÃO IMPLEMENTADO | Sem `mergedIntoId/supersededById`, `SizeProfile/DataQualityIssue/IdentityMerge`, preview/confirm |
| CAD-08 dados ausentes sem impedir | PARCIAL | Não-bloqueio ok; sem sinalização (`MISSING_DATA`, `GET /data-quality-issues`) |
| CAD-09 contagem por vínculos ativos | PARCIAL | Conta pessoas distintas vigentes; `GET /families` ignora `asOf` (só detail/person respeitam) |
| CAD-10 tamanhos com data | NÃO IMPLEMENTADO | Sem `SizeProfile`, sem `PUT /people/:id/sizes` |
| CAD-11 mínimo no atendimento p/ completar depois | IMPLEMENTADO | Só name+family+validFrom+isReference obrigatórios; PATCH com reason/revision permite completar |
| EST-01–03 | PREPARADO | `placeholder.ts` + `Category/Unit/Item/StockReceipt` stubs |
| EST-04–10 | NÃO IMPLEMENTADO | Sem triagem/saldo/ajustes/contagem/unidade/validade/histórico |
| EST-11 | NÃO IMPLEMENTADO | Desejável |
| ENT-01–07 | PREPARADO | `placeholder.ts` + `Delivery/DeliveryLine` stubs; sem rotas, sem gateway ligado |
| ENT-08/09 | NÃO IMPLEMENTADO | Desejáveis |
| BAZ-01–04 | PREPARADO (01) / NÃO IMPLEMENTADO (02–04 comportamento) | `placeholder.ts` + `BazarTransfer` stub sem `receiptId/externalReference` únicos |
| ACS login | PARCIAL | `POST /auth/login`, `GET /auth/me`, Bearer; sem cookie/Redis, sem gestão contas |
| ACS contas/perfis/sessão | NÃO IMPLEMENTADO / CONTRADITÓRIO | Papéis código ≠ SPEC; sem UserAccount/Role/Session |
| AUD escrita | PARCIAL | Atômica local ATD/CAD; modelo dual divergente; sem consulta |
| REL-05/06 | IMPLEMENTADO (FASE 6) | `StockMovementReport/DeliveryReportUseCase` + `PrismaReportRepository` (leitura) + `GET /reports/stock-movements|deliveries` (+`/records` com `queryFingerprint` simplificado e `409 REPORT_CHANGED`) + páginas `/reports/*` com CSV no cliente; sem gestão de contas ACS (RF-ACS-01–07 seguem como dívida técnica) |
| FIC/ATV-PERIODIC/FRQ/APT/MIG | FORA DESTE REPOSITÓRIO | Via gateway apenas |

## 6. Matriz de rastreabilidade

```text
RF-ATD-01/02/03/04/08 → RegisterServiceRecordUseCase → application/use-cases/register-service-record/ → PrismaServiceRecordRepository.save() → ServiceRecord/HomeVisit (schema.prisma) → register-service-record.use-case.test.ts + service-record.routes.test.ts + prisma-service-record.repository.integration.test.ts
RF-ATD-05 → CorrectServiceRecordNoteUseCase → correct-service-record-note.use-case.test.ts
RF-ATD-06 → HomeVisit entity + Get/List outputs (homeVisit/hasHomeVisit) → home-visit.entity.test.ts + rotas get/list + AttendancePage.tsx (ícone)
RF-ATD-07 → Cancel/CorrectNoteUseCase → ServiceRecordAuditEntry (mesma tx) → cancel/correct tests + integração
RF-ATD-02/03 → RegistryGateway.resolveMembership → PrismaRegistryGateway (prisma-registry.gateway.ts) → InMemoryRegistryGateway (testes)
APT-pendente → PendingEligibilityGateway (sempre PENDING; RN-18/LAC-01) → pending-eligibility.gateway.test.ts (não injetado em ATD — correto)
ACS-parcial → JwtAuthGateway → POST /auth/login, middlewares authenticate/authorize → jwt-auth.gateway.test.ts
RF-CAD-01 → CreateFamilyUseCase → PrismaFamilyRepository + PrismaFamilyCodeGenerator → Family (schema.prisma) → families.routes.test.ts (11)
RF-CAD-02/11 → RegisterPersonUseCase + CorrectPersonUseCase → PrismaPersonRepository + UoW → Person → persons.routes.ts (sem teste dedicado)
RF-CAD-03/04/05 → AddFamilyMemberUseCase + EndFamilyMembershipUseCase → PrismaMembershipRepository + UoW → FamilyMembership → families.routes.ts (POST :id/members, POST memberships/:id/closure)
RF-CAD-06/09 → SearchFamilies/SearchPersons/GetFamily/GetPersonUseCase → normalization.ts (normalizeSearchText) → FamiliesPage/FamilyDetailPage
EST/ENT/BAZ → placeholder.ts + 9 tabelas stub → SEM comportamento, SEM teste
```

## 7. Auditoria da modelagem

- CAD presente parcial: `Family.code @unique` + `family_code_seq` conforme D-01; `Person.cpf` sem unique conforme SPEC (merge, não rejeição). Divergências: `Family.locationType LocationType NOT NULL` vs SPEC `location?` nulável; `Person.sex PersonSex?` enum vs SPEC texto livre ≤100; `validFrom/validUntil @db.Date` (perde hora/fuso) vs D-01 intervalo `[inclusivo,exclusivo)`; extras operacionais `searchText/revision/createdAt/updatedAt` sem correspondente D-01 (aceitáveis como infra).
- Constraints MVP-D04 implementadas via índices parciais na migration (`membership_active_person`, `membership_active_holder`); só cobrem intervalo aberto — sobreposição de intervalos fechados fica na aplicação.
- Ausentes SPEC-CAD §1: `SizeProfile`, `DataQualityIssue`, `IdentityMerge`, `Family.mergedIntoId`, `Person.mergedIntoId`, `FamilyMembership.supersededById`.
- ATD: `ServiceRecord` sem FK p/ Family/Person/Membership/Activity (proposital, IDs externos via gateway) mas impede integridade referencial exigida por D-05; `ServiceRecordStatus` sem `REVERSED` (D-05/D-07 exigem; ENT futuro quebra sem migração); `executorName/executorRole` ok mínimo.
- EST/ENT/BAZ: todos os campos de negócio ausentes (ver §4/§5 da auditoria: `Category.name`, `Unit.symbol/decimalPlaces`, `Item.name/categoryId/unitId`, `DonationOrigin/OriginType`, `ReceiptLine`, `StockBalance`, `AdjustmentReason`, `StockCount/Line`, `Delivery.serviceRecordId unique/assessmentId/status`, `DeliveryLine`, `DeliveryReversal`, `BazarTransfer.receiptId/externalReference uniques`, `StockLot/StockMovement` campos). Migração futura será breaking.
- D-02/D-03/D-04/D-09: `Institute/Project/Activity/ServiceType` inexistentes (intencional via gateway, exceto `ServiceType` desnormalizado em `ServiceRecord`); `ParticipantEnrollment/ActivitySession/Attendance/EligibilityPolicy/Assessment/Evidence`, `SocialForm` e blocos, `UserAccount/Role/RoleAssignment/AccessRule`, `OperationRecord`, `AccessLog` inexistentes.
- AUD dual: `AuditEntry` (genérica CAD) vs `ServiceRecordAuditEntry` (específica ATD) com campos divergentes da SPEC-AUD (`operationId/revision/actorType/classification`, único `(entityType,entityId,revision)` ausentes).

## 8. Auditoria da arquitetura

Respeitado: Feature First (`atd/registration/inventory/deliveries/bazar` + `shared/`), Clean 4 camadas no ATD/CAD (domínio puro, use-cases via interface, infra Prisma, presentation Zod+mapeamento), Composition Root só em `api/src/app.ts`, rotas validam e delegam, auth global exceto `/health` e `/auth/login`.

Vazamento: `DonationTypeNotAllowedError` definida em `application/.../register-service-record.use-case.ts` e importada pela presentation — deveria estar em `domain/errors/` como as demais.

Dívidas conhecidas: `bcrypt.hash` de fixtures no boot (`app.ts`), fixtures em memória em vez de PostgreSQL/Redis, `redis.client.ts` sem uso, código morto (`Revision.of`, `PersonNotInFamilyError`, `put/del` sem chamador), sem prefixo `/api/v1`, envelope `{data}/{code,message}` vs CORE `{error:{code,message,details,requestId}}`, sem `Idempotency-Key`, sem paginação `{data,pagination}`, `FutureDateError` compara `recordedAt.slice(0,10)<occurredAt` (frágil a fuso; `APP_TIMEZONE` não aplicado).

## 9. Auditoria frontend/backend

- Login ↔ `POST /auth/login`: coerente e funcional. `PrivateRoute` só checa `localStorage erp_token`, sem validar expiração/papel (ok porque backend autoriza, mas UI permite navegar e só falha na API).
- `/attendance` ↔ `/service-records*`: registro (201), listagem por família, cancelamento com revision; erros exibem `code: message`. Desalinhamentos: frontend força `personId: null` (`service-records.api.ts`) — individual impossível pela UI embora backend suporte; `ACTIVITY_OPTIONS` hardcoded + `DEFAULT_FAMILY_ID="fam-001"` com TODOs p/ `GET /families?query=` e `GET /service-types` inexistentes; correção de note sem UI; list ignora `from/to`; lógica de erro em `cancelServiceRecord`/`closeMembership` frágil (`data===undefined`).
- CAD frontend ↔ backend: `families.api.ts`/`persons.api.ts` alinhados (envelope `{data}`, `expectedRevision/reason`); páginas cobrem criar/listar/detalhar família, cadastrar pessoa, add membro, closure, correct. Faltam: duplicatas/review, troca titular dedicada, transferência, reconciliação, merge, issues, tamanhos, `asOf` histórico, `birthDate` na busca.
- Nenhum endpoint chamado que não exista. Backend tem funcionalidades sem UI (correctNote, personId individual, asOf) — aceitável nesta fase.

## 10. Auditoria de testes

Protegem: invariantes `ServiceRecord` (futuro, ONE_OFF, HOME_VISIT obrigatória/proibida, doação bloqueada, vínculo na data, `AC-04` duas datas), `ExecutorInfo`, concorrência otimista (`updateMany where revision`, 409), mapeamento HTTP (400/404/409/422, 401, 403), atomicidade registro+auditoria (integração ATD, UoW CAD), adapters in-memory (registry/activity/pending/auth).

Lacunas: sem teste de `registration/application` (só `fakes.ts`), sem teste de `persons.routes`, `correct/add/closure` HTTP, `auth.routes`, matriz completa de papéis, concorrência real (saldo, `family_code_seq`, índices parciais sob race), `OperationRecord`/idempotência, `before/after` sem segredos, retenção LAC-08, D-02–D-09, EST/ENT/BAZ, relatórios, merge, migração. Zero testes frontend (`web/**/*.test.*` vazio) — nenhum contrato frontend↔backend fixado.

## 11. Divergências encontradas

### Requisito x Código

- Problema: `sex` enum + CPF com DV vs SPEC texto livre + só normalização. Fonte: SPEC-CAD §1 vs `schema.prisma`/`person.entity.ts`/`cpf.value-object.ts`. Estado: MALE/FEMALE/OTHER exigido; CPF inválido (DV) rejeitado. Esperado: textos ≤100 sem enum; CPF 11 dígitos indexado sem validar DV. Impacto: rejeita cadastros que a spec aceitaria; corrige parcialmente RF-CAD-02.
- Problema: `locationType` obrigatório vs `location?` nulável. Fonte: SPEC-CAD §1 vs `schema.prisma`/`families.routes.ts`/`NewFamilyPage.tsx` (default URBAN). Estado: URBAN/RURAL exigido. Esperado: null permitido. Impacto: baixo, mas contradiz "família pode ser criada sem membros/dados".
- Problema: `correct-person` não corrige birthDate/sex/cpf/rg. Fonte: SPEC-CAD §2 vs `correct-person.use-case.ts`. Estado: só name/phone/occupation/education. Esperado: complementar/corrigir todos os campos RF-02/RF-08. Impacto: RF-CAD-08 incompleto.
- Problema: `GET /families` ignora `asOf`. Fonte: SPEC-CAD §5 vs `search-families.use-case.ts`/`families.routes.ts`. Estado: `asOf` aceito mas usa `today`. Esperado: repassar `asOf`. Impacto: contagem histórica incorreta no list.

### Modelagem x Código

- Problema: `ServiceRecordStatus` sem REVERSED. Fonte: D-05/D-07 vs `schema.prisma`/`service-record.entity.ts`. Estado: só COMPLETED/CANCELED. Esperado: incluir REVERSED. Impacto: ENT futuro exige migração; hoje correto (só ENT cria REVERSED).
- Problema: EST/ENT/BAZ stubs sem campos. Fonte: D-05–D-08 vs `schema.prisma` `Category/Unit/Item/Stock*/Delivery*/BazarTransfer`. Estado: só `id/timestamps`. Esperado: campos §7 desta auditoria. Impacto: tabelas migradas parecem "parcialmente prontas" — não são.
- Problema: auditoria dual. Fonte: SPEC-AUD §2–3 vs `AuditEntry` + `ServiceRecordAuditEntry`. Estado: dois modelos paralelos, snapshots parciais. Esperado: `OperationRecord` + `AuditEntry` único com `(entityType,entityId,revision)` único. Impacto: reconstrução e consulta global inviáveis.

### Arquitetura x Código

- Problema: auth Bearer+localStorage vs cookie+Redis; papéis `SOCIAL_WORKER/STOCK_DISTRIBUTION` vs `SOCIAL_ASSISTANCE/ADMINISTRATOR`. Fonte: SPEC-ACS vs `jwt-auth.gateway.ts`/`api-client.ts`/`users.fixture.ts`. Estado: dívida declarada. Esperado: contrato SPEC antes de dados reais (DEC-08/LAC-08, FASE 6). Impacto: segurança; sem gestão contas/sessões.
- Problema: erro em `domain` no arquivo de use-case. Fonte: Clean vs `register-service-record.use-case.ts` (`DonationTypeNotAllowedError`). Estado: presentation importa de application. Esperado: `domain/errors/`. Impacto: cosmético.

### Documentação x Documentação

- ATD-06 parcial (`traceability.md`) vs concluída (`ROADMAP-AD.md` FASE 1b). Leitura: parcial (UI desacoplada, LAC-13 aberta).
- `specs/README.md` §4 (ATD em andamento) vs `ROADMAP-AD.md` (FASE 1 concluída). Leitura: snapshot desatualizado no índice.
- SPEC-REL §1 corpo ("REL-05/06 ficam fora") vs cabeçalho+AGENTS+índice (dentro). Leitura: dentro; corpo com redação invertida.
- ERS nascimento/sexo obrigatórios vs PRD/SPEC mínimo nome+família. Leitura: mínimo nome+vínculo, DEC-01 decide final.
- ADR-001 refs ("identidade pertence ao BC", `README §2.1`) vs estrutura atual (CAD é AD; `AGENTS.md`). Referência desatualizada; decisão de gateways válida.

### Planejamento x Estado real

- `traceability.md` ("CAD não iniciado") vs código (CAD núcleo funcional). Leitura: traceability desatualizada; esta auditoria a substitui como fotografia.
- Tabelas stub migradas vs "scaffold". Leitura: scaffold, não progresso funcional.

## 12. Funcionalidades bloqueadas

- FALTANTE, MAS BLOQUEADA: ENT-02/06 (contrato real FRQ + LAC-01/DEC-02), BAZ plena (LAC-07/DEC-07; protótipo usa referência manual provisória), dados reais (DEC-08/LAC-08), REL-05/06 (sem fonte EST/ENT), tamanhos adultos (LAC-12), dupla pertença (DEC-01/LAC-02).
- FALTANTE E PRONTA: CAD-04 troca titular, CAD-05 transfer atômico, CAD-06 duplicate-candidates/review, CAD-08 DataQualityIssue, CAD-10 SizeProfile (sintético ok), CAD-09 asOf no list, CAD-02 correct amplo, EST-01–10 (FASE 3), ENT-01/03/04/05/07 após EST (FASE 5).

ENT não deve avançar além de desenho enquanto EST não existir e o contrato FRQ não chegar; BAZ não deve ir além de referência manual provisória; nenhum dado real antes de DEC-08/LAC-08.

## 13. FASE ATUAL

```text
FASE ATUAL:
FASE 2 — CAD (em andamento; entre FASE 1 ATD concluída e FASE 2 completa)

PROGRESSO:
ATD-01–08 com comportamento real + testes + tela web (ATD-06 parcial); CAD núcleo (família/pessoa/vínculo/busca) funcional + rotas + UI + 11 testes de rotas; EST/ENT/BAZ em scaffold sem comportamento.

CONCLUÍDO:
- ATD-Core backend (5 use-cases, 5 rotas, auditoria transacional) + ATD-06 homeVisit/hasHomeVisit + tela /attendance
- CAD-01/03/11; PrismaRegistryGateway no Composition Root; seed idempotente; frontend CAD base
- Correções D4/D5 da auditoria anterior; alinhamento documental D1/D6

EM ANDAMENTO:
- CAD-02/04/05/06/08/09 (parciais listados na matriz)

BLOQUEADO:
- ENT-02/06 (contrato FRQ), BAZ plena (LAC-07), dados reais (DEC-08/LAC-08), REL-05/06 (sem fonte)

FALTANDO PARA CONCLUIR A FASE:
- RF-CAD-04 troca titular dedicada; RF-CAD-05 transfer atômico + reconciliação; RF-CAD-06 duplicate-candidates/review; RF-CAD-07 merge (+ modelos mergedIntoId/supersededById); RF-CAD-08 DataQualityIssue; RF-CAD-10 SizeProfile; RF-CAD-09 asOf no list; RF-CAD-02 correct amplo + ajuste sexo/CPF conforme SPEC
```

O projeto está entre a FASE 1 e a FASE 2 porque ATD está concluída e CAD está parcialmente implementada; nada de EST/ENT/BAZ saiu do scaffold.

## 14. Últimos avanços confirmados

- CAD núcleo: `family.entity.ts`, `person.entity.ts`, `family-membership.entity.ts` (`isActiveOn`/`overlaps`/`end`), VOs cpf/postal-code/family-code, 10 use-cases, `PrismaFamily/Person/MembershipRepository`, `PrismaRegistrationUnitOfWork`, `normalization.ts`, `PrismaRegistryGateway` único em `shared/` (duplicata removida), `app.ts` com families/persons routes, migration `add_registration_module`, seed idempotente (5 famílias, 10 pessoas, 10 vínculos), frontend CAD (FamiliesPage, NewFamilyPage, FamilyDetailPage, NewPersonPage), `FamilyMemberItem.revision`.
- Validação relatada: typecheck api+web limpo, testes verdes, `setup.sh` Linux com paridade ao `setup.ps1` (fora do escopo funcional, mas base operacional).

## 15. Próximo passo

```text
PRÓXIMO PASSO RECOMENDADO:
Fechar CAD desbloqueado antes de EST: transferência atômica + troca titular + duplicate-candidates/review + DataQualityIssue + SizeProfile + asOf no list + correct-person amplo.

MOTIVO:
É o próximo elo da sequência CORE→ACS/AUD→ATD→CAD→EST→BAZ→ENT→REL; EST/ENT/BAZ dependem de identidade/vínculo vigente + merge + auditoria. Avançar sem isso propaga dívida de identidade para estoque/entregas.

DEPENDÊNCIAS:
Nenhuma nova (Composition Root, middlewares, UoW e padrão de auditoria existentes).

RFs ENVOLVIDOS:
RF-CAD-02 (correct amplo, sexo/CPF), RF-CAD-04 (reference-changes), RF-CAD-05 (membership-transfers + reconciliação), RF-CAD-06 (duplicate-candidates/review), RF-CAD-07 (identity-merges + mergedIntoId), RF-CAD-08 (data-quality-issues), RF-CAD-09 (asOf), RF-CAD-10 (sizes).

ARQUIVOS/MÓDULOS PROVAVELMENTE ENVOLVIDOS:
api/src/features/registration/ (entities, use-cases, routes families/persons, repositories, unit-of-work), api/src/shared/infrastructure/gateways/prisma-registry.gateway.ts, api/prisma/schema.prisma + nova migration, web/src/features/registration/ (pages + api), testes nos 3 níveis (padrão ATD).
```

## 16. Riscos e pontos de atenção

1. Auth fora da SPEC-ACS vira dívida de segurança se receber dados reais antes de DEC-08/LAC-08 (FASE 6 prevê refinamento).
2. Tabelas stub migradas podem ser lidas como "EST/ENT/BAZ parcialmente prontos" — não são; nenhuma rota/teste existe.
3. `GET /families` e `GET /service-types` ainda não existem como o frontend ATD esperava (TODOs); CAD agora tem `GET /families` mas sem `service-types`.
4. Contrato real de aptidão (FRQ/Fabrício) continua pendente para ENT-02/06; `PendingEligibilityGateway` correto por enquanto.
5. `traceability.md` e `specs/README.md` §4/§7 estão com snapshots desatualizados (CAD "não iniciado", ATD "em andamento", REL corpo invertido) — atualizá-los após esta auditoria evita leitura errada de progresso.
6. Sexo/CPF/locationType divergentes da SPEC podem travar cadastros reais se DEC-01 for mais permissiva que o código.

## 17. Dívidas técnicas conhecidas (pós-protótipo)

- RF-ACS-01–07: auth usa Bearer+localStorage em vez de httpOnly cookie + Redis. Roles divergem do SPEC-ACS. Resolver antes de uso com dados reais (DEC-08/LAC-08).
- queryFingerprint individual: implementação atual usa max(updatedAt) das fontes. SPEC-REL §3 exige fingerprint por revisão individual. Registrado como evolução futura.
- RF-CAD-07/08/09/10: DataQualityIssue, busca de duplicidades e unificação de identidade deferidos.
- ChangeHolderUseCase, TransferMembershipUseCase: deferidos para integração com BC do Fabrício.
- EligibilityGateway: PendingEligibilityGateway retorna sempre PENDING (correto — RN-18/LAC-01). Substituir quando FRQ/APT entregar o contrato real.
- LAC-01, LAC-03, LAC-06, LAC-07, LAC-13: lacunas da ERS ainda abertas. Decisões institucionais pendentes.
