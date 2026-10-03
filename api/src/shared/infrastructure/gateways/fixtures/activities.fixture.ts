import type { ActivitySnapshot, ServiceTypeSnapshot } from "../../../domain/gateways/activity.gateway.js";

export const serviceTypesFixture: ServiceTypeSnapshot[] = [
  { serviceTypeId: "st-donation", code: "ITEM_DONATION", name: "Doacao de itens" },
  { serviceTypeId: "st-visit", code: "HOME_VISIT", name: "Visita domiciliar" },
  { serviceTypeId: "st-medical", code: "MEDICAL", name: "Atendimento medico" },
  { serviceTypeId: "st-psych", code: "PSYCHOLOGICAL", name: "Atendimento psicologico" },
  { serviceTypeId: "st-physio", code: "PHYSIOTHERAPY", name: "Fisioterapia" },
];

// Only ONE_OFF activities here. PERIODIC activities belong to the FRQ front.

export const activitiesFixture: ActivitySnapshot[] = [
  {
    activityId: "act-donation",
    name: "Entrega de cestas",
    nature: "ONE_OFF",
    serviceType: serviceTypesFixture[0]!,
    revision: 1,
    isActive: true,
  },
  {
    activityId: "act-visit",
    name: "Visita domiciliar",
    nature: "ONE_OFF",
    serviceType: serviceTypesFixture[1]!,
    revision: 1,
    isActive: true,
  },
  {
    activityId: "act-medical",
    name: "Atendimento medico avulso",
    nature: "ONE_OFF",
    serviceType: serviceTypesFixture[2]!,
    revision: 1,
    isActive: true,
  },
  {
    activityId: "act-closed",
    name: "Atendimento encerrado",
    nature: "ONE_OFF",
    serviceType: serviceTypesFixture[3]!,
    revision: 1,
    isActive: false,
  },
];
