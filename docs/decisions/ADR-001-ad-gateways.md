# ADR-001 — Uso de interfaces de gateway para dependências externas do módulo AD

## Contexto

- Identidade de Family/Person pertence ao BC (docs/specs/README.md §2.1).
- Fatos históricos devem conservar familyId/membershipId do instante do fato
  (docs/specs/02-registration.md:30-32).
- Duplicar entidades criaria segunda fonte de verdade e divergência com BC/FRQ/APT.
- LAC-02/DEC-01 ainda abertos; duplicar congela interpretação provisória.

## Decisão

Implementar RegistryGateway, ActivityGateway, EligibilityGateway, AuthGateway
como interfaces no shared/domain/gateways/.
Implementações atuais: in-memory com dados sintéticos.

## Consequência

Protótipo evolutivo: quando BC entregar, substitui-se o adapter sem alterar domain/application.
PendingEligibilityGateway retorna PENDING conforme RN-18/LAC-01 — comportamento correto.
