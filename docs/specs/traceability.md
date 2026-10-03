# Rastreabilidade dos requisitos — frente AD

Fonte: [ERS 1.0](<../ERS — ERP Social Luz da Esperança.md>), catálogo de 101 requisitos funcionais. Autoridade do recorte: [AGENTS.md](../../AGENTS.md). Esta matriz rastreia somente o escopo deste repositório (frente AD — equipe de Gabriel): o que está implementado, parcial, em scaffold ou planejado, mais o que pertence ao repositório FRQ. Não reivindica testes executados além dos registrados no [ROADMAP-AD](../ROADMAP-AD.md), nem aprovação institucional. Decisões adotadas e condições institucionais pendentes (DEC/LAC) estão no [índice](README.md).

Contagem: 7 implementados + 1 parcial + 21 em scaffold + 20 planejados + 4 desejáveis + 48 fora do escopo atual (40 no repositório FRQ e 8 REL de dados FRQ/APT) = 101.

## Implementados

| Requisito da ERS | Spec proprietária / contrato | Evidência |
| --- | --- | --- |
| RF-ATD-01 | ATD — Registro de atendimento (atividade, tipo, data, pessoa, família, executor) | `POST /service-records`, use-case de registro |
| RF-ATD-02 | ATD — Pessoa cadastrada e vinculada à família | Validação de vínculo na data do fato |
| RF-ATD-03 | ATD — Atendimento à família sem indicar membro | `personId` opcional |
| RF-ATD-04 | ATD — Ocorrências próprias por data, sem gerar presença | Sem conceito de presença no módulo |
| RF-ATD-05 | ATD — Observação curta, sem diagnóstico/prescrição/prontuário | `note` limitada, sem campos clínicos |
| RF-ATD-07 | ATD — Correção/cancelamento com motivo, preservando o original | Rotas de correção de nota e cancelamento + auditoria |
| RF-ATD-08 | ATD — Executor com nome e função, mesmo sem conta | `ExecutorInfo` (nome/função) |

## Parcialmente implementados

| Requisito da ERS | Spec proprietária / contrato | Pendência |
| --- | --- | --- |
| RF-ATD-06 | ATD — Visita domiciliar (data, responsável, situação encontrada, ligada à família) | `HomeVisit` com `observedSituation` existe, mas não é exposta na listagem; vínculo com a família é indireto (via atendimento). LAC-13 aberta. |

## Planejados (scaffold criado)

Tabelas placeholder e diretórios de scaffold existem; nenhum comportamento implementado.

| Requisito ou grupo | Spec proprietária / contrato |
| --- | --- |
| RF-EST-01 a RF-EST-10 | EST — Catálogo, entradas, triagem, saldo, ajustes, contagem |
| RF-ENT-01 a RF-ENT-07 | ENT — Entrega atômica, aptidão via gateway, reversão |
| RF-BAZ-01 a RF-BAZ-04 | BAZ — Referência única, conferência, entrada no estoque |

## Planejados (não iniciados)

| Requisito ou grupo | Spec proprietária / contrato |
| --- | --- |
| RF-CAD-01 a RF-CAD-11 | CAD — Pessoas, famílias, vínculos, busca, duplicidades |
| RF-ACS-01 a RF-ACS-07 | ACS/AUD — Autenticação, contas, perfis, auditoria |
| RF-REL-05, RF-REL-06 | REL — Estoque por período, entregas por família |

## Desejáveis (pós-protótipo)

Sem inclusão explícita; não implementam sem decisão do responsável.

| Requisito ou grupo | Origem |
| --- | --- |
| RF-ATD-09 | Agendamento (EVO-04; LAC-04) |
| RF-ENT-08 | Compatibilidade por numeração (EVO-01; LAC-12) |
| RF-ENT-09 | Prioridade, limites, intervalos (EVO-05; LAC-03) |
| RF-EST-11 | Consolidação por doador/campanha (EVO-02; LAC-09) |

## Fora deste repositório (FRQ — Fabrício)

| Requisito ou grupo | Motivo |
| --- | --- |
| RF-FIC-01 a RF-FIC-10 | Ficha social — repositório FRQ |
| RF-ATV-01 a RF-ATV-09 | Atividades periódicas, inscrições, encontros — repositório FRQ. Exceção: tipos `ONE_OFF` consumidos via `ActivityGateway` para validação em ATD |
| RF-FRQ-01 a RF-FRQ-08 | Frequência — repositório FRQ. Atendimento pontual não é presença |
| RF-APT-01 a RF-APT-07 | Aptidão — repositório FRQ. Aqui vale somente o contrato `EligibilityGateway` |
| RF-MIG-01 a RF-MIG-06 | Migração do Bússola Social — repositório FRQ |

## Fora do escopo atual (REL de dados FRQ/APT)

Permanecem na [SPEC-REL](07-reports.md) e serão implementados somente se o escopo for expandido.

| Requisito ou grupo | Motivo |
| --- | --- |
| RF-REL-01 a RF-REL-04, RF-REL-07 a RF-REL-10 | Relatórios sobre ficha, frequência, aptidão e alcance — dependem de dados FRQ/APT |

## Contratos transversais

CORE é proprietário de tipos, datas, envelopes, transação/revisão e idempotência. AUD participa de todas as escritas (autor, data do fato e do lançamento, valores anterior e novo, motivo). Desenvolvimento e demonstração usam dados sintéticos (`DATA_MODE=SYNTHETIC`); uso real depende das decisões DEC/LAC pertinentes, sem presumi-las como aprovadas.
