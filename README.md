# ERP Atendimento

ERP Social da instituição Luz da Esperança — protótipo da frente AD (Atendimentos e Doações).

## Executar o projeto

1. Instale Node.js 22+, pnpm e Docker Desktop.
2. Clone o repositório.
3. Prepare o ambiente (na raiz do repositório, via PowerShell):

```powershell
.\scripts\setup.ps1
```

4. Suba o backend (terminal 1) e o frontend (terminal 2):

```powershell
pnpm --dir api dev    # http://localhost:3000
pnpm --dir web dev    # http://localhost:5173
```

5. Abra http://localhost:5173 e teste.

O `scripts/setup.ps1` verifica ferramentas, instala dependências, cria `api/.env`
(sem sobrescrever um existente), sobe PostgreSQL/Redis via Docker, gera o
Prisma Client, aplica migrations, executa o seed e valida o ambiente. É
idempotente: pode rodar quantas vezes quiser — reutiliza o que já está
pronto, sem operações destrutivas (nunca roda `migrate reset`,
`compose down -v`, nem apaga dados ou `.env`). Se o Docker Desktop estiver
fechado, abra-o antes de rodar o script.

Login de teste (dados sintéticos): `coordenacao` / `senha123`
(também `assistente` e `estoque`, mesma senha).

## Comandos úteis

| Comando | Efeito |
|---|---|
| `pnpm dev` | API + Web no mesmo terminal |
| `pnpm typecheck` | `tsc --noEmit` em api e web |
| `pnpm test` | 61 testes unitários (sem banco) |
| `pnpm test:integration` | 6 testes com PostgreSQL real (exige `DATABASE_URL` no shell) |
| `pnpm db:migrate` | `prisma migrate dev` (api) |
| `pnpm db:seed` | seed informativo (sintéticos vivem nos gateways in-memory) |
| `pnpm build:api` / `pnpm build:web` | builds de produção |

Nota: a API não usa `dotenv` — o `api/.env` é lido pelo Prisma CLI e pelo
`setup.ps1`. Para rodar a API manualmente, exporte `DATABASE_URL` no shell
(`$env:DATABASE_URL="postgresql://erp:erp@localhost:5432/erp_social"`).
