# Roadmap — Frente AD (ERP Social Luz da Esperança)

## FASE 0 — Fundação ✅ CONCLUÍDA
Gateways (RegistryGateway, ActivityGateway, EligibilityGateway, AuthGateway),
auth JWT, middlewares, schema placeholder, fixtures sintéticas, 67 testes verdes,
migrations aplicadas.

## FASE 1 — ATD (Atendimentos pontuais) ✅ CONCLUÍDA
1a. ATD-01/02/03/04/05/07/08 ✅ RF-ATD-Core implementado
1b. ATD-06 ✅ HomeVisit exposta nos outputs (`homeVisit` em get/list, `hasHomeVisit` na listagem)
Tela web mínima ✅ `/attendance` (registro + lista + cancelamento)

## FASE 2 — CAD (Cadastro)
RF-CAD-01 a RF-CAD-11
Substitui InMemoryRegistryGateway por PrismaRegistryGateway
Implementa Family, Person, FamilyMembership com vigência, busca, duplicidades

## FASE 3 — EST (Estoque social)
3a. Catálogo: Category, Unit, Item, DonationOrigin (RF-EST-01/02)
3b. Entrada e triagem: StockReceipt, ReceiptLine, StockLot (RF-EST-03/04/05)
3c. Saldo e ajustes: StockBalance, StockMovement, StockCount (RF-EST-06–10)

## FASE 4 — BAZ (Recebimento do Bazar)
RF-BAZ-01 a RF-BAZ-04
Depende de: EST-3a (Category/Unit/Item existindo)
BazarTransfer com externalReference único, origem BAZAR no estoque

## FASE 5 — ENT (Entregas às famílias)
RF-ENT-01 a RF-ENT-07
Depende de: ATD (FASE 1), EST (FASE 3), contrato EligibilityGateway (FRQ/Fabrício)
Entrega atômica com saída de estoque, consulta prévia de aptidão, reversão integral

## FASE 6 — REL + ACS ✅ CONCLUÍDA
RF-REL-05 (movimentação de estoque) e RF-REL-06 (entregas por família)
implementados com queryFingerprint simplificado e CSV no cliente.
RF-ACS-01–07 registrados como dívida técnica (ver docs/audits/).

## Bloqueadores conhecidos
- ENT-02/06: aguarda contrato real de aptidão (FRQ/Fabrício + LAC-01)
- BAZ: LAC-07 (referência/divergência do Bazar) em aberto — implementar com referência
  manual provisória para o protótipo
- Dados reais: DEC-08/LAC-08 em aberto — manter DATA_MODE=SYNTHETIC

## Estado do protótipo — COMPLETO
Todas as fases implementadas: FASE 0–6.
190 testes verdes. Zero migrations pendentes.
Validação final: rodar com Docker (ver README).
