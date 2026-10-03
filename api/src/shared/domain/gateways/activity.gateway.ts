// AD usa apenas atividades ONE_OFF. PERIODIC pertence a frente FRQ — nao implementar aqui.

export interface ServiceTypeSnapshot {
  serviceTypeId: string;
  code: string;
  name: string;
}

export interface ActivitySnapshot {
  activityId: string;
  name: string;
  nature: "ONE_OFF";
  serviceType: ServiceTypeSnapshot;
  revision: number;
  isActive: boolean;
}

export interface ActivityGateway {
  requireOneOffActivity(activityId: string): Promise<ActivitySnapshot>;
  listActiveOneOffActivities(): Promise<ActivitySnapshot[]>;
}
