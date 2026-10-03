# SPEC-BAZ — Recebimento do Bazar: referência única e entrada no estoque

Versão 1.0 · Dependências: [CORE](00-foundation.md), [EST](10-inventory.md), [ACS](01-access.md) e [AUD](08-audit.md). Fontes: PRD 1.1 CAP-09, RN-07/17; ERS RF-BAZ-01–04, LAC-07; modelagem D-05/D-08.

## 1. Resultado e modelo

Itens do Bazar podem ir para o estoque de doações. A transferência é movimentação interna, não nova arrecadação: mantém registrada a origem Bazar (RN-07).

| Entidade | Campos |
| --- | --- |
| `BazarTransfer` | `id`, `receiptId`, `externalReference` |

`BazarTransfer.receiptId` e `externalReference` são únicos. Uma origem Bazar exige exatamente uma transferência; outra origem não pode ter transferência associada. A referência e todos os fatos do recebimento são persistidos juntos; rascunhos não consomem referência nem produzem saldo. Nenhuma referência é consumida antes da confirmação.

## 2. Recebimento e conferência

- RF-BAZ-01: registrar o recebimento com a referência, os itens, as quantidades e as unidades informadas. Linha do Bazar exige quantidade informada, inclusive quando nada chegou.
- RF-BAZ-02: registrar a quantidade efetivamente recebida e as diferenças em relação ao informado; só o recebido entra no saldo. `receivedQuantity - informedQuantity` é a divergência física; `acceptedQuantity + rejectedQuantity = receivedQuantity` é a conferência da triagem. O destino das divergências segue LAC-07 — não se força sua conversão em descarte.
- RF-BAZ-03 / RN-17: não aceitar a mesma referência duas vezes. A transferência é reconhecida uma única vez, pelo que foi efetivamente recebido. Reapresentação com outra chave identifica o registro existente e não cria segunda entrada; mesma chave e conteúdo retornam o sucesso anterior; falha antes do commit deixa referência e chave disponíveis. Recebimento sem quantidade aceita continua conferível e não altera o saldo.
- RF-BAZ-04 / RN-07/RN-17: relatórios mostram a origem Bazar separada das doações externas, sem somá-la ao total arrecadado. Movimentos de entrada do Bazar usam o tipo `BAZAR_IN` (SPEC-EST).

## 3. Operações

| Operação | Entrada / resultado |
| --- | --- |
| `confirmReceipt` com origem Bazar | `command` (origem, instante do fato, referência do Bazar, linhas conferidas) + `operationKey`; valida unicidade concorrente da referência, cria `StockReceipt` + `BazarTransfer` + linhas + lotes + movimentos `BAZAR_IN`/`TRIAGE_DISCARD` em transação atômica; referência já recebida retorna o recebimento anterior sem nova entrada |

Exemplo: dez unidades informadas e oito recebidas, todas aceitas, produzem divergência de duas faltantes, oito de entrada e nenhum descarte.

## 4. Critérios de aceite

| ID | Cenário |
| --- | --- |
| AC-07 | A mesma transferência do Bazar é apresentada duas vezes; o recebimento é registrado; a entrada é aceita uma única vez, com referência, quantidade e origem |

## 5. Lacunas abertas

LAC-07 (como o Bazar comunica a transferência, qual referência usa, como tratar divergências, caminho inverso) permanece aberta — para o protótipo, lançamento manual com a referência do Bazar e sem caminho inverso. Uso com dados reais depende ainda de DEC-07 e DEC-08/LAC-08; desenvolvimento e demonstração usam dados sintéticos.
