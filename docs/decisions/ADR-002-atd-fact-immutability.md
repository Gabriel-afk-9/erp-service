# ADR-002 — Campos de fato do atendimento são imutáveis após registro

## Contexto

- RF-ATD-07 permite "corrigir ou cancelar" um atendimento.
- Campos como familyId, personId, occurredAt e activityId representam o fato histórico.
- RN-09 diz que mudanças cadastrais não transferem fatos anteriores.
- RN-08 exige que correções tenham autor e motivo.

## Decisão

Apenas o campo note pode ser corrigido via CorrectServiceRecordNoteUseCase.
Corrigir os campos de fato (family, person, date, activity) equivale a mudar
o que aconteceu — o operador deve cancelar e re-registrar.
Isso evita que o sistema vire um editor de fatos históricos.

## Consequência

- PATCH /service-records/:id/note (somente note)
- PATCH /service-records/:id/cancel (cancelamento completo)
- Sem endpoint para editar family/person/date/activity de registro já concluído.
