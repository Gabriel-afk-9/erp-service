# SPEC-EST — Estoque social: catálogo, entradas, triagem, saldo e ajustes

Versão 1.0 · Dependências: [CORE](00-foundation.md), [ACS](01-access.md) e [AUD](08-audit.md). Fontes: PRD 1.1 CAP-07, RN-06/10/11/12; ERS RF-EST-01–10, LAC-06; modelagem D-05/D-06/D-08. Consolidação por doador RF-EST-11 fica fora (desejável, EVO-02).

## 1. Resultado e modelo

Mostrar o que entrou, o que está disponível e para onde foi cada item. Só itens aceitos na triagem compõem o saldo que pode ser entregue.

| Entidade | Campos |
| --- | --- |
| `Category` | `id`, `name`; código único |
| `Unit` | `id`, `symbol`, `decimalPlaces`, `quantityIncrement`; precisão não negativa, incremento positivo |
| `Item` | `id`, `name`, `categoryId`, `unitId`, `size?`, `requiresExpiration` |
| `DonationOrigin` | `id`, `type`, `name?`, `reference?`; identificação mínima, sem gestão de relacionamento |
| `StockReceipt` | `id`, `originId`, `receivedBy`; fato registrado com data do fato e do lançamento |
| `ReceiptLine` | `id`, `receiptId`, `itemId`, `unitId`, `informedQuantity?`, `receivedQuantity`, `acceptedQuantity`, `rejectedQuantity`, `rejectionReason?` |
| `StockLot` | `id`, `itemId`, `unitId`, `receiptLineId?`, `countLineId?`, `expiresOn?`; origem em exatamente uma linha |
| `StockBalance` (derivado) | `stockLotId`, `onHandQuantity`, `availableQuantity(referenceDate)` |
| `StockMovement` | `id`, `stockLotId?`, `receiptLineId?`, `deliveryLineId?`, `countLineId?`, `type`, `quantity`, `balanceDelta`, `reasonId?`, `reversesMovementId?`; imutável no uso operacional |
| `AdjustmentReason` | `id`, `code`, `description`; código único |
| `StockCount` | `id`, `responsibleId`, `scope` |
| `StockCountLine` | `id`, `countId`, `stockLotId?`, `itemId`, `unitId`, `expiresOn?`, `expectedQuantity`, `countedQuantity`, `balanceRevision` |

`OriginType`: `PERSON`, `ORGANIZATION`, `CAMPAIGN`, `BAZAR`, `AD_HOC`, `UNKNOWN`. `MovementType` e efeito:

| Tipo | Quantidade e efeito | Origem obrigatória |
| --- | --- | --- |
| `DONATION_IN` / `BAZAR_IN` | Positiva; `+quantity` | Linha de recebimento e lote aceito |
| `TRIAGE_DISCARD` | Descartada positiva; efeito zero | Linha de recebimento, sem lote |
| `DELIVERY_OUT` | Positiva; `-quantity` | Linha de entrega e lote |
| `ADJUSTMENT_IN` / `ADJUSTMENT_OUT` | Positiva; efeito positivo/negativo | Motivo e lote; linha de contagem quando aplicável |
| `OPENING_BALANCE` | Positiva; efeito positivo | Contagem física e lote |
| `DELIVERY_REVERSAL` | Mesma quantidade da saída; efeito inverso | `reversesMovementId` apontando para o `DELIVERY_OUT` |

`balanceDelta` é determinado pelo tipo, não é valor livre. Saldo após cada movimento é reconstruível em ordem determinística; relatórios por data do fato identificam lançamentos retroativos.

## 2. Catálogo e origens

- RF-EST-01: cadastrar itens com nome, categoria, unidade e, quando fizer sentido, tamanho ou numeração. Categoria e unidade são cadastros configuráveis; alterar a unidade de item com movimentos não reinterpreta quantidades antigas.
- RF-EST-02: cadastrar origens — doador pessoa física, doador empresa e campanha. Origem `UNKNOWN` é admitida somente quando a política de LAC-06 permitir; origem Bazar exige exatamente uma transferência (SPEC-BAZ) e outra origem não pode ter transferência associada.
- Quantidades usam decimal exato; precisão e incremento pertencem à unidade (LAC-06). Não se arredonda quantidade para satisfazer o incremento.

## 3. Entrada e triagem

- RF-EST-03: registrar cada entrada com data, origem (cadastrada, avulsa ou desconhecida), itens, quantidades, unidades e responsável pelo recebimento.
- RF-EST-04: registrar triagem com quantidade aceita e descartada, com motivo; só a aceita entra no saldo. Conferência da linha: `acceptedQuantity + rejectedQuantity = receivedQuantity`; quantidades não negativas; descarte positivo exige motivo. Recebimentos externos podem não ter quantidade anunciada (`informedQuantity=null`), sem divergência inventada.
- Cada linha com aceita positiva gera um ou mais lotes, cada um com uma única entrada inicial; a soma das entradas equivale exatamente à aceita. Descarte preserva quantidade e motivo, sem entrar ou sair do saldo. Linhas totalmente faltantes ou rejeitadas continuam no recebimento, mesmo sem lote. Repetir a confirmação não recria lotes nem entradas.

## 4. Saldo, validade e histórico

- RF-EST-05: mostrar saldo disponível por item, tamanho e unidade, agregando lotes compatíveis. `onHandQuantity` é a soma dos efeitos dos movimentos e nunca é negativa; `availableQuantity` exclui lotes vencidos na referência consultada.
- RF-EST-08 / RN-11: a unidade de linhas, lote e movimentos corresponde à do item; sem regra de conversão aprovada, unidade divergente é rejeitada — unidades diferentes não se somam.
- RF-EST-09: registrar validade de perecíveis, sinalizar próximos do vencimento e impedir entrega de vencidos. Vencimento bloqueia disponibilidade sem apagar o saldo físico; material já vencido no recebimento não é aceito como distribuível. Critério de aceitação e limite de vencimento dependem de LAC-06.
- RF-EST-10 / RN-16: mostrar o histórico de movimentações de cada item, com o saldo após cada uma. Em consulta histórica, saldos são reconstruídos com movimentos cuja data do fato não excede a referência; entradas posteriores não antecipam saldo.
- Disponibilidade do lote (D-06): `AVAILABLE` → `EXPIRED` (validade expira) → `EMPTY` (saldo zero); saldo zero não é exclusão. A conferência de vencimento acontece na consulta e na confirmação, mesmo sem processo agendado.

## 5. Ajustes e contagens

- RF-EST-06 / RN-11: ajustes por perda, avaria, vencimento ou contagem, sempre com motivo e responsável. Retificações geram movimentos compensatórios e auditoria; `StockMovement` não é editado.
- RF-EST-07: contagens físicas registram saldo observado, quantidade física e revisão usada; a diferença fica registrada e só altera o estoque após confirmação do ajuste. Revisão desatualizada exige reconciliação, nunca aplicação silenciosa. Entrada positiva por contagem de material sem lote cria lote identificado por item/unidade/validade.

## 6. Operações

| Operação | Entrada / resultado |
| --- | --- |
| Catálogo (`Category/Unit/Item/DonationOrigin/AdjustmentReason`) | Criação e administração com revisão e auditoria; códigos únicos; inativação preserva histórico |
| `confirmReceipt(command, operationKey)` | Origem, instante do fato, linhas (informada/recebida/aceita/descartada, unidade, motivo, lotes com validade); cria recebimento, linhas, lotes e movimentos `DONATION_IN`/`TRIAGE_DISCARD` em transação atômica; chave repetida com mesmo conteúdo retorna o recebimento existente sem duplicar |
| Consulta de saldo | Item/tamanho/unidade e data de referência; retorna físico e disponível por lote |
| Ajuste e contagem | Motivo, responsável, linhas conferidas; diferença registrada antes de confirmar |

## 7. Critérios de aceite

| ID | Cenário |
| --- | --- |
| AC-05 | Há 5 unidades disponíveis; uma entrega de 2 é registrada e a confirmação é repetida; existe uma única entrega de 2 unidades, e restam 3 |
| AC-06 | O saldo é menor que o pedido, ou a operação é interrompida; alguém tenta concluir a entrega; nenhuma entrega é registrada, o saldo não muda e o motivo aparece |
| AC-11 | Um item é impróprio na triagem, ou a contagem física difere do saldo; a triagem ou a contagem é registrada; o item impróprio não entra no saldo; a diferença fica registrada com motivo |

## 8. Lacunas abertas

LAC-06 (unidades, categorias, triagem, validade, perdas, ajustes, estornos, origem desconhecida) permanece aberta; nenhum valor, regra de conversão ou limite de vencimento é presumido. Uso com dados reais depende ainda de DEC-06 e DEC-08/LAC-08; desenvolvimento e demonstração usam dados sintéticos.
