# Handoff — Protótipo Frente AD

## O que foi construído
ERP Social Luz da Esperança — Frente AD (Gabriel)
Protótipo evolutivo com 6 fases concluídas.

## Módulos implementados
| Módulo | RFs | Status |
|--------|-----|--------|
| Fundação (gateways, auth) | — | ✅ |
| ATD — Atendimentos pontuais | RF-ATD-01–08 | ✅ |
| CAD — Cadastro | RF-CAD-01–06 | ✅ |
| EST — Estoque social | RF-EST-01–10 | ✅ |
| BAZ — Recebimento do Bazar | RF-BAZ-01–04 | ✅ |
| ENT — Entregas às famílias | RF-ENT-01–07 | ✅ |
| REL — Relatórios | RF-REL-05, 06 | ✅ |

## Como executar
1. Requisitos: Docker, Node.js, pnpm
2. docker compose up -d
3. pnpm install
4. pnpm db:migrate
5. pnpm db:seed
6. pnpm dev

Credenciais sintéticas:
  coordenacao / senha123 (COORDINATION)
  assistente  / senha123 (SOCIAL_WORKER)
  estoque     / senha123 (STOCK_DISTRIBUTION)

## Testes
pnpm test — 190 testes unitários
pnpm --dir api exec vitest run — suíte completa, inclui integração (exige banco via Docker)

## Arquitetura
Feature First + Clean Architecture + DDD + SOLID
Ports & Adapters para dependências do BC (Fabrício):
  RegistryGateway, ActivityGateway, EligibilityGateway, AuthGateway
Ver docs/decisions/ADR-001-ad-gateways.md e ADR-002-atd-fact-immutability.md

## Dívidas técnicas conhecidas
Ver docs/audits/PROJECT-ALIGNMENT-AUDIT.md
