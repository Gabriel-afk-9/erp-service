import { prisma } from "../src/shared/infrastructure/database/prisma.client.js";

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function buildFamilySearchText(fields: {
  code: string;
  referenceName: string | null;
  address: string | null;
  neighborhood: string | null;
}): string {
  return normalizeSearchText([fields.code, fields.referenceName ?? "", fields.address ?? "", fields.neighborhood ?? ""].join(" "));
}

function buildPersonSearchText(fields: { name: string; cpf: string | null }): string {
  return normalizeSearchText([fields.name, fields.cpf ?? ""].join(" "));
}

const families = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    code: "000001",
    referenceName: "Familia Silva 01",
    address: "Rua Ficticia 1",
    neighborhood: "Bairro Exemplo",
    postalCode: "60000001",
    locationType: "URBAN" as const,
    contactPhone: null as string | null,
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    code: "000002",
    referenceName: "Familia Souza 02",
    address: "Rua Ficticia 2",
    neighborhood: "Bairro Exemplo",
    postalCode: "60000002",
    locationType: "URBAN" as const,
    contactPhone: null,
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    code: "000003",
    referenceName: "Familia Oliveira 03",
    address: "Rua Ficticia 3",
    neighborhood: "Bairro Exemplo",
    postalCode: "60000003",
    locationType: "RURAL" as const,
    contactPhone: null,
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    code: "000004",
    referenceName: "Familia Santos 04",
    address: "Rua Ficticia 4",
    neighborhood: "Bairro Exemplo",
    postalCode: "60000004",
    locationType: "URBAN" as const,
    contactPhone: null,
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    code: "000005",
    referenceName: "Familia Pereira 05",
    address: "Rua Ficticia 5",
    neighborhood: "Bairro Exemplo",
    postalCode: "60000005",
    locationType: "URBAN" as const,
    contactPhone: null,
  },
];

const persons = [
  { id: "20000000-0000-0000-0000-000000000001", name: "Titular Familia 01", birthDate: "1980-01-01", cpf: null as string | null },
  { id: "20000000-0000-0000-0000-000000000002", name: "Membro 02 Familia 01", birthDate: "2005-05-05", cpf: null },
  { id: "20000000-0000-0000-0000-000000000003", name: "Membro 03 Familia 01", birthDate: "2010-10-10", cpf: null },
  { id: "20000000-0000-0000-0000-000000000004", name: "Titular Familia 02", birthDate: "1975-02-02", cpf: null },
  { id: "20000000-0000-0000-0000-000000000005", name: "Conjuge Familia 02", birthDate: "1978-03-03", cpf: null },
  { id: "20000000-0000-0000-0000-000000000006", name: "Titular Familia 03", birthDate: "1990-04-04", cpf: null },
  { id: "20000000-0000-0000-0000-000000000007", name: "Ex Membro Familia 03", birthDate: "2000-06-06", cpf: null },
  { id: "20000000-0000-0000-0000-000000000008", name: "Titular Familia 04", birthDate: "1985-07-07", cpf: null },
  { id: "20000000-0000-0000-0000-000000000009", name: "Titular Familia 05", birthDate: "1970-08-08", cpf: null },
  { id: "20000000-0000-0000-0000-000000000010", name: "Membro 10 Familia 05", birthDate: "2012-09-09", cpf: null },
];

const memberships = [
  { id: "30000000-0000-0000-0000-000000000001", familyId: families[0].id, personId: persons[0].id, relationship: "holder", isReference: true, validFrom: "2024-01-01", validUntil: null as string | null },
  { id: "30000000-0000-0000-0000-000000000002", familyId: families[0].id, personId: persons[1].id, relationship: "child", isReference: false, validFrom: "2024-01-01", validUntil: null },
  { id: "30000000-0000-0000-0000-000000000003", familyId: families[0].id, personId: persons[2].id, relationship: "child", isReference: false, validFrom: "2024-01-01", validUntil: null },
  { id: "30000000-0000-0000-0000-000000000004", familyId: families[1].id, personId: persons[3].id, relationship: "holder", isReference: true, validFrom: "2024-01-01", validUntil: null },
  { id: "30000000-0000-0000-0000-000000000005", familyId: families[1].id, personId: persons[4].id, relationship: "spouse", isReference: false, validFrom: "2024-01-01", validUntil: null },
  { id: "30000000-0000-0000-0000-000000000006", familyId: families[2].id, personId: persons[5].id, relationship: "holder", isReference: true, validFrom: "2024-01-01", validUntil: null },
  { id: "30000000-0000-0000-0000-000000000007", familyId: families[2].id, personId: persons[6].id, relationship: "child", isReference: false, validFrom: "2024-01-01", validUntil: "2024-06-01" },
  { id: "30000000-0000-0000-0000-000000000008", familyId: families[3].id, personId: persons[7].id, relationship: "holder", isReference: true, validFrom: "2024-01-01", validUntil: null },
  { id: "30000000-0000-0000-0000-000000000009", familyId: families[4].id, personId: persons[8].id, relationship: "holder", isReference: true, validFrom: "2024-01-01", validUntil: null },
  { id: "30000000-0000-0000-0000-000000000010", familyId: families[4].id, personId: persons[9].id, relationship: "child", isReference: false, validFrom: "2024-01-01", validUntil: null },
];

async function main(): Promise<void> {
  const existing = await prisma.family.count();
  if (existing >= 5) {
    console.log(`Seed ja aplicado: ${existing} familias encontradas, pulando insercao CAD.`);
    console.log("Atividades: 3 ONE_OFF via InMemoryActivityGateway");
    console.log("Usuarios: coordenacao, assistente, estoque (senha: senha123)");
    console.log("Aptidao: sempre PENDING — PendingEligibilityGateway");
    return;
  }

  for (const family of families) {
    await prisma.family.upsert({
      where: { id: family.id },
      create: {
        id: family.id,
        code: family.code,
        referenceName: family.referenceName,
        address: family.address,
        neighborhood: family.neighborhood,
        postalCode: family.postalCode,
        locationType: family.locationType,
        contactPhone: family.contactPhone,
        searchText: buildFamilySearchText(family),
        revision: 1,
      },
      update: {},
    });
  }

  for (const person of persons) {
    await prisma.person.upsert({
      where: { id: person.id },
      create: {
        id: person.id,
        name: person.name,
        birthDate: person.birthDate ? new Date(person.birthDate) : null,
        cpf: person.cpf,
        searchText: buildPersonSearchText({ name: person.name, cpf: person.cpf }),
        revision: 1,
      },
      update: {},
    });
  }

  for (const membership of memberships) {
    await prisma.familyMembership.upsert({
      where: { id: membership.id },
      create: {
        id: membership.id,
        familyId: membership.familyId,
        personId: membership.personId,
        relationshipToReference: membership.relationship,
        isReference: membership.isReference,
        validFrom: new Date(membership.validFrom),
        validUntil: membership.validUntil ? new Date(membership.validUntil) : null,
        revision: 1,
      },
      update: {},
    });
  }

  await prisma.$executeRawUnsafe(`SELECT setval('family_code_seq', 5, true)`);

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const alimentos = await prisma.category.create({ data: { name: "Alimentos", description: "Itens alimenticios" } });
    const higiene = await prisma.category.create({ data: { name: "Higiene", description: "Itens de higiene" } });
    const vestuario = await prisma.category.create({ data: { name: "Vestuário", description: "Roupas e calcados" } });
    const un = await prisma.unit.create({ data: { symbol: "UN", name: "Unidade", decimalPlaces: 0, quantityIncrement: 1 } });
    const kg = await prisma.unit.create({ data: { symbol: "KG", name: "Quilograma", decimalPlaces: 3, quantityIncrement: 0.1 } });
    const litro = await prisma.unit.create({ data: { symbol: "L", name: "Litro", decimalPlaces: 3, quantityIncrement: 0.5 } });
    await prisma.item.createMany({
      data: [
        { categoryId: alimentos.id, unitId: kg.id, name: "Arroz 1kg", requiresExpiration: true },
        { categoryId: alimentos.id, unitId: kg.id, name: "Feijão 1kg", requiresExpiration: true },
        { categoryId: higiene.id, unitId: un.id, name: "Sabonete", requiresExpiration: false },
        { categoryId: vestuario.id, unitId: un.id, name: "Camiseta", requiresExpiration: false },
      ],
    });
    console.log("Seed EST-3a aplicado: 3 categorias, 3 unidades, 4 itens");
    void litro;
  } else {
    console.log(`Seed EST-3a ja aplicado: ${categoryCount} categorias encontradas.`);
  }

  const receiptCount = await prisma.stockReceipt.count();
  if (receiptCount === 0) {
    const arroz = await prisma.item.findFirst({ where: { name: "Arroz 1kg" } });
    const feijao = await prisma.item.findFirst({ where: { name: "Feijão 1kg" } });
    if (arroz && feijao) {
      const receipt = await prisma.stockReceipt.create({
        data: {
          originType: "PERSON",
          donorName: "Doador Sintético",
          receivedBy: "seed",
          receivedAt: new Date("2024-01-15"),
          note: "Recebimento sintético de demonstração",
          operationKey: "00000000-0000-0000-0000-000000000001",
          fingerprint: "seed",
        },
      });
      const line1 = await prisma.receiptLine.create({
        data: {
          receiptId: receipt.id,
          itemId: arroz.id,
          unitId: arroz.unitId,
          informedQuantity: 10,
          receivedQuantity: 9,
          acceptedQuantity: 9,
          rejectedQuantity: 0,
          expiresOn: new Date("2026-01-15"),
        },
      });
      const line2 = await prisma.receiptLine.create({
        data: {
          receiptId: receipt.id,
          itemId: feijao.id,
          unitId: feijao.unitId,
          informedQuantity: 5,
          receivedQuantity: 5,
          acceptedQuantity: 4,
          rejectedQuantity: 1,
          rejectionReason: "Embalagem violada",
          expiresOn: new Date("2026-01-15"),
        },
      });
      const lot1 = await prisma.stockLot.create({
        data: { itemId: arroz.id, unitId: arroz.unitId, receiptLineId: line1.id, expiresOn: new Date("2026-01-15") },
      });
      const lot2 = await prisma.stockLot.create({
        data: { itemId: feijao.id, unitId: feijao.unitId, receiptLineId: line2.id, expiresOn: new Date("2026-01-15") },
      });
      await prisma.stockMovement.createMany({
        data: [
          { itemId: arroz.id, unitId: arroz.unitId, lotId: lot1.id, receiptLineId: line1.id, type: "DONATION_IN", quantity: 9, balanceDelta: 9, occurredAt: new Date("2024-01-15"), recordedBy: "seed" },
          { itemId: feijao.id, unitId: feijao.unitId, lotId: lot2.id, receiptLineId: line2.id, type: "DONATION_IN", quantity: 4, balanceDelta: 4, occurredAt: new Date("2024-01-15"), recordedBy: "seed" },
          { itemId: feijao.id, unitId: feijao.unitId, receiptLineId: line2.id, type: "TRIAGE_DISCARD", quantity: 1, balanceDelta: 0, occurredAt: new Date("2024-01-15"), recordedBy: "seed", reason: "Embalagem violada" },
        ],
      });
      console.log('Seed EST-3b aplicado: 1 recebimento, saldo "Arroz 1kg" = 9 KG');
    }
  } else {
    console.log(`Seed EST-3b ja aplicado: ${receiptCount} recebimentos encontrados.`);
  }

  console.log("Seed CAD aplicado: 5 familias, 10 pessoas, 10 vinculos");
  console.log("Codigos: 000001..000005 (proximo: 000006)");
  console.log("Atividades: 3 ONE_OFF via InMemoryActivityGateway");
  console.log("Usuarios: coordenacao, assistente, estoque (senha: senha123)");
  console.log("Aptidao: sempre PENDING — PendingEligibilityGateway");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
