# SPEC-ENT — Entregas às famílias: registro atômico, aptidão e reversão

Versão 1.0 · Dependências: [CORE](00-foundation.md), [ATD](09-service-records.md), [EST](10-inventory.md), [ACS](01-access.md), [AUD](08-audit.md) e contrato `EligibilityGateway` (repositório FRQ). Fontes: PRD 1.1 CAP-08, RN-06/10/14/19; ERS RF-ENT-01–07, LAC-01/LAC-03; modelagem D-05/D-07. Compatibilidade RF-ENT-08 e prioridade/limites RF-ENT-09 ficam fora (desejáveis, EVO-01/EVO-05).

## 1. Resultado e modelo

A entrega é a saída efetiva de itens para uma família e fica registrada, ao mesmo tempo, no histórico da família e no estoque. A aptidão permite considerar a família, mas não garante a entrega (RN-03).

| Entidade | Campos |
| --- | --- |
| `Delivery` | `id`, `serviceRecordId` (único), `assessmentId`, `collectedByPersonId?`, `exceptionReason?`, `authorizedBy?`, `status` |
| `DeliveryLine` | `id`, `deliveryId`, `stockLotId`, `unitId`, `quantity` |
| `DeliveryReversal` | `id`, `deliveryId` (único), `reason` |

`DeliveryStatus`: `COMPLETED`, `REVERSED`. Entrega concluída tem ao menos uma linha positiva. `Delivery.serviceRecordId` é único: cada entrega corresponde a exatamente um atendimento pontual do tipo doação. Família e instante do fato correspondem ao atendimento; a avaliação pertence à mesma família e data. Cada linha corresponde a exatamente uma saída com mesmo lote, unidade e quantidade; linhas repetidas do mesmo lote são consolidadas para validar o total.

## 2. Consulta prévia e confirmação

- RF-ENT-01: registrar a entrega com data, itens, quantidades, unidades e responsável e, opcionalmente, o membro que retirou. O membro que retirou, se informado, deve pertencer à família na data do fato.
- RF-ENT-02: ao registrar, mostrar a aptidão da família com sua evidência, as necessidades declaradas, as entregas anteriores e o saldo dos itens. A consulta inicial é informativa; a confirmação repete as validações dentro da operação atômica, com aptidão obtida da FRQ para a data do fato. Aptidão, justificativa e autorizador são preservados como contexto da confirmação.
- RF-ENT-03 / RN-10: gravar a entrega como atendimento pontual e como saída do estoque na mesma operação — grava os dois ou nenhum. Em lançamento tardio, aptidão e validade usam a data do fato, mantendo identificável a data de lançamento; registro retroativo não autoriza saldo negativo.
- RF-ENT-04: impedir entrega acima do saldo disponível, informando o saldo. A confirmação usa saldo protegido contra concorrência; duas confirmações que disputam o mesmo saldo não podem ambas concluir.
- RF-ENT-05: não duplicar a entrega quando a confirmação for repetida. Chave de operação (`operationKey`) já concluída com mesmo conteúdo retorna a entrega existente sem alterações; com conteúdo diferente, conflita. Mudanças posteriores de saldo não impedem recuperar o resultado já concluído.
- RF-ENT-06: para família Não apta ou Pendente, exigir justificativa e identificar quem autorizou. Bloquear a entrega só depois de definida a política. Enquanto o critério não for configurado, toda família fica Pendente (RN-18) e Pendente não equivale a Não apta. LAC-01 e LAC-03 abertas — nenhum bloqueio automático é presumido.
- Cada entrega é contada uma vez nos totais de estoque e uma vez nos totais de atendimento, nunca em dobro (RN-19).

## 3. Estorno

RF-ENT-07: permitir estornar entrega lançada por engano, com motivo, devolvendo as quantidades ao saldo e mantendo o registro original. `DeliveryReversal.deliveryId` é único; `StockMovement.reversesMovementId` também é único quando preenchido — o fluxo cobre estorno integral, sem presumir devoluções físicas parciais. O estorno recompõe os lotes originais e muda entrega e atendimento juntos (`REVERSED`); se o lote venceu, a recomposição aumenta o saldo físico, mas continua indisponível para nova entrega. Atendimento com entrega não pode ser cancelado isoladamente pelo ATD. Estorno repetido com a mesma chave ou outra produz um único crédito por saída original.

## 4. Operações

| Operação | Entrada / resultado |
| --- | --- |
| `openDelivery(familyId, occurredAt)` | Consulta aptidão (FRQ), necessidades autorizadas, histórico e saldo; retorna informações para decidir a entrega, sem reservar nada |
| `confirmDelivery(command, operationKey)` | Família, instante do fato, lotes/quantidades, executor, justificativa/autorizador quando exigidos; valida tudo em transação atômica, cria `ServiceRecord` + `Delivery` + linhas + saídas + auditoria; retorna entrega e saldo atualizado, ou o motivo do impedimento sem nada persistir |
| `reverseDelivery(deliveryId, reason, operationKey)` | Motivo obrigatório; cria `DeliveryReversal`, compensa cada saída uma única vez nos lotes originais, marca entrega e atendimento como `REVERSED`; estorno já existente é retornado sem novo crédito |

Não há reserva obrigatória de estoque. Seleção de lote não presume prioridade automática de distribuição nem regra de separação ainda não validada (RN-14: compatibilidade ajuda a selecionar, não decide).

## 5. Critérios de aceite

| ID | Cenário |
| --- | --- |
| AC-05 | Há 5 unidades disponíveis; uma entrega de 2 é registrada e a confirmação é repetida; existe uma única entrega de 2 unidades, e restam 3 |
| AC-06 | O saldo é menor que o pedido, ou a operação é interrompida; alguém tenta concluir a entrega; nenhuma entrega é registrada, o saldo não muda e o motivo aparece |
| AC-10 | Uma família recebe duas entregas no período; o relatório de alcance é gerado; mostra uma família e duas entregas contadas uma vez cada |
| AC-17 | Chega um calçado nº 39 (desejável); a equipe consulta famílias compatíveis; lista membros com nº 39 e separa os sem numeração; nada é entregue automaticamente |

## 6. Lacunas abertas

LAC-01 (o que conta como "frequentando") e LAC-03 (prioridade, limites, intervalos, autorizador) permanecem abertas; sem política configurada, nenhuma entrega é bloqueada automaticamente. O contrato real de aptidão depende do repositório FRQ — até lá, `PendingEligibilityGateway` (sempre PENDING) é o comportamento correto. Uso com dados reais depende ainda de DEC-02/DEC-03 e DEC-08/LAC-08.
