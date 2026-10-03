# Project Alignment Audit — frente AD

Data da auditoria: 03/10/2026. Atualização pós-alinhamento: FASE 1 encerrada.
Fonte da verdade: documentos oficiais do repositório (PRD, ERS, modelagem, specs, ADRs, AGENTS.md).
O código foi tratado como evidência, nunca como referência.

## 1. Resumo executivo

A auditoria encontrou uma divergência central (D1): o código implementava o protótipo da
frente AD (ATD parcial), enquanto o MVP normativo (AGENTS.md + specs copiadas do repositório
FRQ) excluía ATD/EST/ENT/BAZ e exigia CAD/FIC/ATV/FRQ/APT/REL/ACS — não implementados.
**D1 está RESOLVIDA**: o alinhamento documental redefiniu este repositório como o protótipo
da frente AD (equipe de Gabriel), com specs 09–12 criadas e ROADMAP-AD publicado.

Estado atual: **FASE 1 (ATD) CONCLUÍDA** — ATD-Core completo (RF-ATD-01–08), tela web
`/attendance` funcional, 65 testes unitários + 6 de integração verdes (total 71), dois bugs
de mapeamento HTTP corrigidos (`DonationTypeNotAllowedError`/`ExecutorInfoInvalidError` → 422)
e `void eligibility` removido do Composition Root. **Próximo passo: FASE 2 — CAD.**

## 2. Documentos analisados

| Documento | Status | Papel |
| --- | --- | --- |
| `AGENTS.md` | NORMATIVO (governança máxima; realinhado à frente AD) | Escopo: CAD/ACS/ATD/EST/ENT/BAZ/REL-AD; FIC/FRQ/APT/MIG externos (FRQ) |
| `docs/specs/README.md` | NORMATIVO (realinhado) | Sequência CORE→ACS/AUD→ATD→CAD→EST→BAZ→ENT→REL |
| `docs/specs/00–02, 08` | NORMATIVO | CORE, ACS, CAD, AUD |
| `docs/specs/03–06` | NORMATIVO no repositório FRQ; aqui valem os cabeçalhos de escopo | FIC/ATV/FRQ/APT externos; consumo via gateway |
| `docs/specs/07` | NORMATIVO parcial | REL-05/06 neste repositório; demais RFs fora do escopo atual |
| `docs/specs/09–12` | NORMATIVO (criadas no alinhamento) | SPEC-ATD/EST/ENT/BAZ, derivadas de ERS + modelagem |
| `docs/specs/traceability.md` | NORMATIVO-auxiliar (realinhada) | 7 + 1 + 21 + 20 + 4 + 48 = 101 |
| `docs/ROADMAP-AD.md` | PLANEJAMENTO vigente | FASE 0–6 da frente AD |
| `PRD-ERP-Luz-da-Esperanca-v1.1.md` | NORMATIVO canônico (negócio) | Produto completo; DEC-01–11 abertas |
| `ERS — ERP Social Luz da Esperança.md` | NORMATIVO-detalhador | 101 RFs (53 BC + 15 FRQ + 33 AD); LAC-01–13 abertas |
| `MODELAGEM-DO-SISTEMA.md` | NORMATIVO (contratos lógicos) | D-01–D-10; D-05–D-08 para ATD/EST/ENT/BAZ |
| `ficha_cadastro_familias_2025.md` | CONTEXTO-fonte | Formulário em papel; presença ≠ obrigatoriedade digital |
| `docs/decisions/ADR-001/002` | Decisões do protótipo AD | Gateways; fato imutável |
| `docs/context/PROJECT-CONTEXT-OPENCODE.md` | CONTEXTO/planejamento | Continuidade técnica do protótipo |
| Bibliografia + Pesquisa documental | CONTEXTO | Não criam requisitos |
| `sandbox.md` | SCRATCH — vazio (0 bytes), deletado no disco | Nada normativo |

## 3. Escopo do protótipo (frente AD)

1. Cadastro de pessoas, famílias e vínculos (CAD) — FASE 2, não iniciado (gateway sintético hoje).
2. Acesso, perfis e auditoria (ACS/AUD) — parcial (auth JWT + auditoria ATD transacional).
3. Atendimentos pontuais + visita domiciliar (ATD) — **CONCLUÍDO (FASE 1)**.
4. Estoque social e entregas (EST/ENT) — scaffold (FASE 3/5).
5. Recebimento do Bazar (BAZ) — scaffold (FASE 4).

## 4. Estado atual (código verificado)

- Backend: `api/src/features/atd/` completo (5 use-cases, 5 rotas, 2 entidades, 1 VO);
  `inventory/`, `deliveries/`, `bazar/` = placeholders; `shared/` com 4 gateways (adapters
  in-memory), auth JWT, middlewares.
- Banco: `ServiceRecord` + `HomeVisit` (1:1) + `ServiceRecordAuditEntry` reais; 9 modelos
  stub; sem tabelas BC (por desenho — dependências via gateway); 2 migrations aplicadas.
- Frontend: login + dashboard + **`/attendance` (formulário de registro, lista por família,
  modal de cancelamento)**; proxy `/service-records` no Vite.
- Testes: **65 unitários + 6 de integração (total 71)**, todos verdes.

## 5. Matriz de requisitos

| RF | Veredito | Evidência |
| --- | --- | --- |
| ATD-01 registro | IMPLEMENTADO | `POST /service-records` + use-case |
| ATD-02 pessoa vinculada | IMPLEMENTADO (valida contra gateway; CAD real na FASE 2) | `resolveMembership` na data do fato |
| ATD-03 dirigido à família | IMPLEMENTADO | `personId` opcional |
| ATD-04 ocorrências por data, sem presença | IMPLEMENTADO | Sem conceito de presença |
| ATD-05 observação curta | IMPLEMENTADO | `note` ≤ 500, sem campos clínicos |
| ATD-06 visita domiciliar | IMPLEMENTADO | `homeVisit` em get/list + `hasHomeVisit`; LAC-13 segue aberta |
| ATD-07 corrigir/cancelar c/ motivo | IMPLEMENTADO | Rotas + auditoria transacional |
| ATD-08 executor nome+função | IMPLEMENTADO | `ExecutorInfo` |
| ATD-09 agendamento | NÃO IMPLEMENTADO | Desejável (LAC-04) |
| EST-01–10, ENT-01–07, BAZ-01–04 | NÃO IMPLEMENTADO | Placeholders + tabelas stub |
| EST-11, ENT-08/09 | NÃO IMPLEMENTADO | Desejáveis |
| CAD-01–11, ACS-01–07, REL-05/06 | NÃO IMPLEMENTADO | Planejados (FASE 2/6) |
| FIC/ATV-PERIODIC/FRQ/APT/MIG | FORA DESTE REPOSITÓRIO | Repositório FRQ |

## 6. Matriz de rastreabilidade

```text
RF-ATD-01/02/03/04/08 → RegisterServiceRecordUseCase → application/use-cases/register-service-record/ → PrismaServiceRecordRepository.save() → ServiceRecord/HomeVisit (schema.prisma) → register-service-record.use-case.test.ts + service-record.routes.test.ts + integração
RF-ATD-05 → CorrectServiceRecordNoteUseCase → correct-service-record-note.use-case.test.ts
RF-ATD-06 → HomeVisit entity + Get/List outputs (homeVisit/hasHomeVisit) → home-visit.entity.test.ts + rotas (get/list) + /attendance (ícone 🏠)
RF-ATD-07 → Cancel/CorrectNoteUseCase → ServiceRecordAuditEntry (mesma tx) → cancel/correct tests + integração
RF-ATD-02/03 → RegistryGateway.resolveMembership → InMemoryRegistryGateway (+ fixtures) → in-memory-registry.gateway.test.ts
APT-pendente → PendingEligibilityGateway (sempre PENDING; RN-18/LAC-01) → pending-eligibility.gateway.test.ts (sem injeção em ATD — correto)
ACS-parcial → JwtAuthGateway → POST /auth/login, middlewares → jwt-auth.gateway.test.ts
EST/ENT/BAZ → placeholder.ts + 9 tabelas stub → SEM comportamento, SEM teste
```

## 7. Auditoria da modelagem

- Comportamento EST/ENT/BAZ ausente: lotes, movimentos, entrega atômica, idempotência (ENT-05),
  unicidade de referência Bazar (BAZ-03) — nada implementado (conforme ROADMAP: FASE 3–5).
- 9 tabelas stub sem comportamento; migrations aplicadas criam estrutura vazia (não confundir
  com requisito atendido).
- `ServiceRecordAuditEntry.operation: String` (deveria ser enum); `before/after` parciais
  (`{status|note, revision}`).
- `DonationTypeNotAllowedError` definida no arquivo do use-case (camada ideal seria domínio) —
  cosmético, sem efeito funcional após o mapeamento 422.

## 8. Auditoria da arquitetura

Respeitado no ATD: Feature First, 4 camadas, domínio sem imports externos, Composition Root
só em `app.ts`, rotas validam (Zod) e delegam. Corrigidos neste ciclo:
1. `DonationTypeNotAllowedError`/`ExecutorInfoInvalidError` sem mapeamento → caíam em 500;
   agora 422 (verificado contra app real via inject).
2. `void eligibility` removido; comentário registra injeção futura em ENT (FASE 5).
Restam como dívida conhecida: auth Bearer+localStorage vs SPEC-ACS (cookie+Redis),
papéis divergentes (`SOCIAL_WORKER`/`STOCK_DISTRIBUTION`), `redis.client.ts` sem uso,
código morto (`Revision.of`, `PersonNotInFamilyError`, `put/del` sem chamador).

## 9. Auditoria frontend/backend

- Login ↔ `POST /auth/login`: coerente e funcional.
- `/attendance` ↔ `/service-records*`: registro (201), listagem por família, cancelamento
  com `revision` do item; erros exibem `code: message` (ex. `DONATION_TYPE_NOT_ALLOWED`).
- Sem validação client-side além de HTML; TODOs comentados para `GET /families` e
  `GET /service-types` (FASE 2).
- Nenhum endpoint chamado que não exista.

## 10. Auditoria de testes

Protegem: invariantes do `ServiceRecord`, vínculo na data, HOME_VISIT obrigatória/proibida,
concorrência otimista (409), mapeamento HTTP (incluindo 422 de doação), atomicidade
registro+auditoria, adapters in-memory. Lacunas: `Get`/`ListByFamily` sem teste unitário
dedicado (cobertos via rotas), matriz de autorização, expiração de sessão, frontend sem
testes, módulos futuros sem testes.

## 11. Divergências encontradas

- **D1 Requisito×Código — ✅ RESOLVIDA.** O código implementava o trilho AD enquanto os
  documentos normativos descreviam o trilho MVP/FRQ. Resolução: alinhamento documental
  concluído — AGENTS.md redefinido para a frente AD, specs FRQ reclassificadas com
  cabeçalhos, specs 09–12 criadas, ROADMAP-AD publicado, traceability realinhada.
- **D2 Auth (Bearer+localStorage vs cookie HttpOnly+Redis, SPEC-ACS) — ABERTA**, registrada
  como dívida (resolver antes de dados reais, DEC-08/LAC-08). Prevista na FASE 6.
- **D3 Papéis divergentes — ABERTA**, mesmo tratamento de D2.
- **D4 Erros→500 — ✅ RESOLVIDA** (422 mapeado e verificado).
- **D5 Elegibilidade morta — ✅ RESOLVIDA** (`void eligibility` removido; PENDING continua
  correto sem contrato FRQ).
- **D6 FASE 0–5 sem documento / sandbox.md vazio — ✅ RESOLVIDA** (ROADMAP-AD é agora o
  plano vigente; `sandbox.md` confirmado como SCRATCH).

## 12. Funcionalidades bloqueadas

- FALTANTE, MAS BLOQUEADA: ENT-02/06 (contrato real FRQ + LAC-01/DEC-02), BAZ (LAC-07/DEC-07;
  protótipo usará referência manual provisória), dados reais (DEC-08/LAC-08).
- FALTANTE E PRONTA: CAD-01–11 (FASE 2, sem dependências externas), EST-01–10 (FASE 3),
  ENT-01/03/04/05/07 (FASE 5, após EST).

## 13. FASE ATUAL

```text
FASE ATUAL: FASE 1 (ATD) CONCLUÍDA — iniciando FASE 2 (CAD)

PROGRESSO: ATD-01–08 com comportamento real + testes + tela web; EST/ENT/BAZ em scaffold

CONCLUÍDO:
- ATD-Core backend (5 use-cases, 5 rotas, auditoria transacional)
- ATD-06: homeVisit/hasHomeVisit nos outputs
- Tela /attendance (registro + lista + cancelamento)
- Correções D4/D5; alinhamento documental D1/D6

EM ANDAMENTO: nada (FASE 1 encerrada)

BLOQUEADO: ENT-02/06 (contrato FRQ), BAZ plena (LAC-07), dados reais (DEC-08/LAC-08)

FALTANDO PARA A FASE 2: implementar RF-CAD-01–11 (Family, Person, FamilyMembership
com vigência, busca, duplicidades; substituir InMemoryRegistryGateway por
PrismaRegistryGateway)
```

## 14. Últimos avanços confirmados

- Alinhamento documental: AGENTS.md, README das specs, traceability, ROADMAP-AD, specs 09–12.
- Encerramento FASE 1: `homeVisit`/`hasHomeVisit` nos outputs, 4 novos testes, tela
  `/attendance`, proxy Vite, ROADMAP atualizado.
- Validação: typecheck limpo (api+web), 65 unit + 6 integração verdes, `vite build` OK,
  inject real 201→cancel 200→re-cancel 409 e doação→422 `DONATION_TYPE_NOT_ALLOWED`.

## 15. Próximo passo

```text
PRÓXIMO PASSO RECOMENDADO: FASE 2 — CAD (RF-CAD-01–11)

MOTIVO: é o próximo elo da sequência CORE→ACS/AUD→ATD→CAD→EST→BAZ→ENT→REL; substitui
o gateway sintético por persistência real, base para EST/ENT/BAZ

DEPENDÊNCIAS: nenhuma nova (usa Composition Root, middlewares e padrão de auditoria existentes)

RFs ENVOLVIDOS: RF-CAD-01 a RF-CAD-11

ARQUIVOS/MÓDULOS PROVAVELMENTE ENVOLVIDOS: api/src/features/registration/ (novo),
PrismaRegistryGateway, schema.prisma (Family, Person, FamilyMembership), nova migration,
testes nos 3 níveis (padrão ATD)
```

## 16. Riscos e pontos de atenção

1. Auth fora da SPEC-ACS vira dívida de segurança se o protótipo receber dados reais antes
   de DEC-08/LAC-08 (FASE 6 prevê o refinamento).
2. Tabelas stub migradas podem ser lidas como "EST/ENT/BAZ parcialmente prontos" — não são.
3. `GET /families` e `GET /service-types` ainda não existem — frontend usa TODOs até a FASE 2.
4. Contrato real de aptidão (FRQ/Fabrício) continua pendente para ENT-02/06.
