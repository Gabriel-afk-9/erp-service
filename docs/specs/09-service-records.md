# SPEC-ATD — Registro de atendimentos pontuais e visita domiciliar

Versão 1.0 · Dependências: [CORE](00-foundation.md), [CAD](02-registration.md) via `RegistryGateway`, [ACS](01-access.md) e [AUD](08-audit.md). Fontes: PRD 1.1 CAP-06, RN-05/08/09/20/21; ERS RF-ATD-01–08, LAC-13; modelagem D-05/D-10. Agendamento RF-ATD-09 fica fora (desejável, EVO-04).

## 1. Resultado e modelo

Registrar cada atendimento realizado como ocorrência própria, comprovada por realização e sem chamada. Atendimento pontual não gera presença nem evidência de aptidão.

| Entidade | Campos |
| --- | --- |
| `ServiceRecord` | `id`, `activityId`, `serviceTypeId`, `familyId`, `personId?`, `membershipId?`, `executorName`, `executorRole`, `note?`, `status`, `revision`, autoria (`RecordedFact`) |
| `HomeVisit` | `serviceRecordId`, `observedSituation` |

`status`: `COMPLETED`, `CANCELED` ou `REVERSED` (`REVERSED` somente via estorno de entrega, conforme SPEC-ENT). `ServiceRecord` sempre tem família e atividade `ONE_OFF` com tipo compatível: entrega exige o tipo de doação de itens; visita exige o tipo de visita domiciliar. Pessoa é opcional para atendimento à família; quando informada, seu vínculo no fato precisa corresponder à família registrada (RN-05, RN-20).

## 2. Registro

- RF-ATD-01: registrar atividade, tipo, data, pessoa e família atendidas e responsável pela execução.
- RF-ATD-02: exigir pessoa cadastrada e vinculada a uma família; o cadastro mínimo segue RF-CAD-11 e RN-21 (nenhum documento é condição para atender).
- RF-ATD-03: permitir atendimento dirigido à família como um todo, sem indicar membro (`personId` ausente).
- RF-ATD-04: aceitar vários atendimentos da mesma pessoa em datas diferentes, cada um como ocorrência própria, sem gerar presença.
- A data do fato (`occurredAt`) nunca é futura; data de lançamento (`recordedAt`) é preservada separadamente (RN-08).

## 3. Visita domiciliar

RF-ATD-06: registrar a visita com data, responsável e situação encontrada, ligada à família. `HomeVisit` é detalhe de atendimento à família (RN-20); tipo `HOME_VISIT` exige o detalhe, demais tipos o proíbem. A classificação da visita como pontual e seu conteúdo seguem LAC-13, **aberta** — nenhum campo além de `observedSituation` é presumido.

## 4. Observação e executor

- RF-ATD-05: observação curta (`note`) sobre o atendimento. Texto livre não autoriza armazenar prontuário, diagnóstico ou prescrição (RES-05).
- RF-ATD-08: executor identificado por nome e função, mesmo sem conta de usuário. Operador que lança (conta) e executor (quem realizou) são papéis distintos; ser operador não cria vínculo assistencial (RN-01).

## 5. Correção e cancelamento

RF-ATD-07, RN-08/RN-09: correção e cancelamento exigem motivo, revisão esperada (`expectedRevision`) e `AuditEntry` com valores anteriores e novos, na mesma transação do fato. O registro original é preservado; não se usa um único campo de motivo para substituir o histórico. Campos de fato (família, pessoa, data, atividade) são imutáveis: só a observação é corrigível; o resto exige cancelar e re-registrar. Atendimento com entrega não pode ser cancelado isoladamente — passa pelo estorno de SPEC-ENT. Mudar o cadastro não transfere atendimentos já feitos para outra família (RN-09).

## 6. Operações

| Operação | Entrada / resultado |
| --- | --- |
| `register` | Atividade `ONE_OFF`, família, pessoa opcional, data, executor, observação e detalhe de visita quando aplicável; retorna o registro com revisão inicial |
| `cancel` | `id`, `expectedRevision`, motivo; marca `CANCELED`, preserva o original |
| `correctNote` | `id`, `expectedRevision`, nova observação, motivo; demais campos intactos |
| `get` | `id`; retorna o registro com detalhe de visita quando existir |
| `listByFamily` | `familyId`, período opcional; retorna ocorrências da família em ordem de data |

## 7. Critérios de aceite

| ID | Cenário |
| --- | --- |
| AC-04 | Uma pessoa é atendida em duas datas; a equipe consulta o histórico; há duas ocorrências de atendimento e nenhuma presença gerada |
| AC-16 | Uma visita domiciliar foi realizada; a visita é registrada; aparece como atendimento pontual da família, com a situação encontrada |

## 8. Lacunas abertas

LAC-13 (visita domiciliar como pontual: natureza e conteúdo) permanece aberta; nenhuma solução é presumida. Uso com dados reais depende ainda de DEC-08/LAC-08; desenvolvimento e demonstração usam dados sintéticos.
