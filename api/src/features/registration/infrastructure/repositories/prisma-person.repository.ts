import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Person, type PersonSex } from "../../domain/entities/person.entity.js";
import type { PersonRepository } from "../../domain/repositories/person.repository.js";
import type { Page, Pagination } from "../../domain/repositories/pagination.js";
import { buildPersonSearchText, normalizeSearchText } from "../normalization.js";
import type { RegistrationPrismaClient } from "./prisma-family.repository.js";

function toCivilDate(value: Date): CivilDate {
  return value.toISOString().slice(0, 10) as CivilDate;
}

type PersonRow = {
  id: string;
  name: string;
  birthDate: Date | null;
  sex: "MALE" | "FEMALE" | "OTHER" | null;
  cpf: string | null;
  rg: string | null;
  occupation: string | null;
  educationLevel: string | null;
  contactPhone: string | null;
  revision: number;
};

function toEntity(row: PersonRow): Person {
  return Person.restore({
    id: row.id,
    name: row.name,
    birthDate: row.birthDate === null ? null : toCivilDate(row.birthDate),
    sex: row.sex as PersonSex | null,
    cpf: row.cpf,
    rg: row.rg,
    occupation: row.occupation,
    educationLevel: row.educationLevel,
    contactPhone: row.contactPhone,
    revision: row.revision,
  });
}

export class PrismaPersonRepository implements PersonRepository {
  constructor(private readonly prisma: RegistrationPrismaClient) {}

  async save(person: Person): Promise<void> {
    await this.prisma.person.upsert({
      where: { id: person.id },
      create: {
        id: person.id,
        name: person.name,
        birthDate: person.birthDate === null ? null : new Date(person.birthDate),
        sex: person.sex,
        cpf: person.cpf,
        rg: person.rg,
        occupation: person.occupation,
        educationLevel: person.educationLevel,
        contactPhone: person.contactPhone,
        searchText: buildPersonSearchText({ name: person.name, cpf: person.cpf }),
        revision: person.revision,
      },
      update: {
        name: person.name,
        birthDate: person.birthDate === null ? null : new Date(person.birthDate),
        sex: person.sex,
        cpf: person.cpf,
        rg: person.rg,
        occupation: person.occupation,
        educationLevel: person.educationLevel,
        contactPhone: person.contactPhone,
        searchText: buildPersonSearchText({ name: person.name, cpf: person.cpf }),
        revision: person.revision,
      },
    });
  }

  async findById(id: string): Promise<Person | null> {
    const row = await this.prisma.person.findUnique({ where: { id } });
    return row === null ? null : toEntity(row);
  }

  async findByCpf(cpf: string): Promise<Person | null> {
    const row = await this.prisma.person.findFirst({ where: { cpf }, orderBy: [{ createdAt: "asc" }] });
    return row === null ? null : toEntity(row);
  }

  async findByQuery(query: string, pagination: Pagination): Promise<Page<Person>> {
    const normalized = normalizeSearchText(query);
    const where = normalized === "" ? {} : { searchText: { contains: normalized } };
    const [total, rows] = await Promise.all([
      this.prisma.person.count({ where }),
      this.prisma.person.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
    ]);
    return { items: rows.map(toEntity), page: pagination.page, pageSize: pagination.pageSize, total };
  }
}
