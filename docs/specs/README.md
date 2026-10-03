# Especificações de implementação — frente AD

Base documental: PRD 1.1 (18/09/2026), ERS 1.0 (24/09/2026), modelagem 1.1 (28/09/2026), ficha de famílias 2025 e decisões de escopo/stack do [AGENTS.md](../../AGENTS.md).

Este repositório implementa o protótipo da frente AD (equipe de Gabriel): CAD, ACS, ATD, EST, ENT, BAZ e REL sobre dados AD. As specs 03–06 foram copiadas do repositório FRQ (Fabrício) e tratam de módulos externos — cada uma carrega um cabeçalho de escopo que prevalece sobre seu conteúdo original. As specs 09–12 são as specs normativas dos módulos AD deste repositório.

**Situação:** ATD-Core implementado (RF-ATD-01–08, com ATD-06 parcial), gateways in-memory para as dependências BC/FRQ, e CAD, EST, ENT, BAZ em scaffold. Testes da aplicação: 67 casos verdes no trilho ATD/gateways. Estado detalhado por fase em [ROADMAP-AD](../ROADMAP-AD.md).

## 1. Specs e propriedade dos contratos

| Spec | Responsabilidade | Fontes funcionais |
| --- | --- | --- |
| [CORE — Contratos comuns](00-foundation.md) | Stack, módulos, tipos, datas, HTTP, transações, idempotência e critérios de conclusão | ERS IU-01–07, INT-04, §3.4–3.6; modelagem §1.2/D-10 |
| [ACS — Acesso](01-access.md) | Autenticação, contas, perfis, autorização e sessões | RF-ACS-01/02/03/06, RNF-SEG |
| [CAD — Cadastro](02-registration.md) | Pessoas, famílias, vínculos, titularidade, numerações, duplicidade e unificação | RF-CAD-01–11 |
| [FIC — Ficha social](03-social-forms.md) | Seleção de campos, fotografia versionada, composição e ciência conhecida | RF-FIC-01/02/04–09; RF-FIC-06 condicionado |
| [ATV — Projetos e atividades](04-projects-activities.md) | Institutos, projetos, naturezas, tipos e inscrições | RF-ATV-01–08 |
| [FRQ — Frequência](05-attendance.md) | Encontros, marcações, correções/cancelamentos, contagens e cobertura | RF-FRQ-01–04/06/07 |
| [APT — Aptidão](06-eligibility.md) | Critério versionado, avaliação em três situações e evidências | RF-APT-01–07 |
| [REL — Consultas e relatórios](07-reports.md) | Históricos de estoque/entregas neste repositório (RF-REL-05/06); demais RFs cobrem dados FRQ/APT, fora do escopo atual | RF-REL-05/06 |
| [AUD — Auditoria](08-audit.md) | Autoria, revisões, snapshots, proteção e reconstrução | RF-ACS-04/05 e RF-ACS-06 quanto à autoria |
| [ATD — Atendimentos pontuais](09-service-records.md) | Registro, visita domiciliar, cancelamento e correção | RF-ATD-01–08 |
| [EST — Estoque social](10-inventory.md) | Catálogo, entradas, triagem, saldo e ajustes | RF-EST-01–10 |
| [ENT — Entregas às famílias](11-deliveries.md) | Entrega atômica, aptidão via gateway, reversão | RF-ENT-01–07 |
| [BAZ — Recebimento do Bazar](12-bazar-transfer.md) | Referência única, conferência, entrada no estoque | RF-BAZ-01–04 |

As specs 03 (FIC), 04 (ATV), 05 (FRQ) e 06 (APT) descrevem módulos do repositório FRQ — não implementar neste repositório, exceto o consumo via gateway indicado em cada cabeçalho de escopo (atividades `ONE_OFF` via `ActivityGateway`, contrato `EligibilityGateway`, leitura de ficha para RF-ENT-02 se necessária).

Uma regra tem um proprietário: CORE define envelope/datas/idempotência; ACS define autorização; CAD resolve identidade/vínculo; ATV organiza atividades/lista; FRQ registra fatos; APT calcula situação; FIC publica a fotografia social; REL consulta; AUD preserva revisões. Módulos usam esses contratos, sem redefinir as regras do proprietário.

A [matriz de rastreabilidade](traceability.md) cobre os requisitos do escopo deste repositório (implementados, parciais, em scaffold e planejados) e identifica os módulos do repositório FRQ, sem reivindicar o produto completo.

## 2. Recorte e conciliação das fontes

Este repositório implementa CAD, ACS, ATD, EST, ENT, BAZ e REL sobre dados AD. Atendimento pontual é ocorrência comprovada por realização, sem chamada, e não gera presença nem evidência de aptidão. Relatórios cobrem somente os módulos acima (RF-REL-05/06); totais informam período, unidade e registros que os compõem.

Não implementar neste repositório (responsabilidade do repositório FRQ — Fabrício):

- Ficha social (FIC) — repositório FRQ
- Atividades periódicas (ATV PERIODIC) — repositório FRQ
- Frequência (FRQ) — repositório FRQ
- Aptidão (APT) — repositório FRQ
- Migração do Bússola Social (MIG)

Também fora do escopo: turmas/vagas/espera, agenda, alerta de ficha/frequência, justificativa de ausência, renda total/per capita, compatibilidade por tamanho, CSV/PDF e auditoria de consultas — desejáveis, sem inclusão explícita. Captação financeira, CRM, vendas, contabilidade, prontuários clínicos, gestão da Escola Espírita e módulos próprios de voluntários ou RH também estão fora do escopo.

| Divergência ou lacuna | Tratamento nas specs |
| --- | --- |
| Nascimento no cadastro mínimo da ERS versus dados ausentes do PRD/modelagem | Nome e vínculo exigidos; nascimento/sexo/documentos desconhecidos permitidos; seleção final em DEC-01 |
| Instituto obrigatório/exclusivo apresentado pela ERS versus pendência do PRD | Um instituto por projeto adotado para o MVP em MVP-D05; ratificação institucional de LAC-04 permanece separada |
| Campo existente no formulário versus aprovação de coleta | Matriz campo a campo e flags; nenhum bloco real habilitado automaticamente |
| Renda “mensal” no nome de atributo da modelagem versus papel sem periodicidade | `incomeAmount` declarado; não presumir periodicidade nem consolidar rendas |
| Lista de participantes versus presença | Inscrição temporal e marcação explícita são contratos distintos |
| Ausência de linha versus ausência física | Linha inexistente é desconhecida; nunca ABSENT automático |
| Avaliação antiga versus correção atual | Avaliação/revisões preservadas; nova avaliação usa conhecimento atual e recebe novo ID |
| Histórico e unificação versus duplicação de contagens | Mapeamento canônico e supersessão explícita, com proveniência e reconciliação |

## 3. Decisões do MVP

Em 01/10/2026, o responsável pelo projeto escolheu as recomendações de todas as cinco perguntas apresentadas. MVP-D01–05 registram essa escolha de produto. MVP-D06–07 são derivações técnicas adotadas para concretizar os contratos de frequência e evidência, sob o mesmo desenho; não são regras institucionais atribuídas ao levantamento.

| ID local | Decisão adotada | Efeito |
| --- | --- | --- |
| MVP-D01 | Aptidão configurável, sem valores padrão e Pendente sem política | Fecha formato e comportamento do mecanismo; valores de DEC-02 continuam institucionais |
| MVP-D02 | Implementar saúde, medicamentos e religião desativados por padrão até aprovação específica | Inclui estruturas/validações/proteção FIC; não habilita coleta ou leitura automaticamente |
| MVP-D03 | Quatro perfis combináveis: Coordenação, Assistência Social, Responsável por Atividade e Administrador | Fecha matriz ACS sem acesso social automático para Administrador; validação institucional de DEC-08 continua pendente |
| MVP-D04 | No máximo uma família vigente por pessoa, preservando os vínculos anteriores | Proíbe sobreposição de pertença na mesma identidade canônica; família atual pode ser desconhecida quando não houver vínculo vigente |
| MVP-D05 | Um instituto por projeto e lista simples de participantes, conforme tratamento provisório da ERS | Fecha cardinalidade ATV no MVP, mantendo turmas/vagas/espera fora; validação institucional de DEC-04/LAC-04 continua pendente |
| MVP-D06 | Denominador operacional `ENROLLMENT_OR_RECORDED` | Frequência considera inscrição válida no encontro ou marcação avulsa explícita; não presume faltas anteriores à inscrição |
| MVP-D07 | Declaração explícita e versionada de cobertura dos encontros | Permite comprovar completude sem inferir que a ausência de registros é ausência factual; alterações relevantes invalidam a declaração |

Essas decisões fecham as alternativas estruturais das specs. MVP-D06 define a consulta operacional; uma política de aptidão continua exigindo seleção explícita de sua modalidade de oportunidades conforme SPEC-APT, sem herdar um default oculto. MVP-D07 não transforma declaração de cobertura em presença individual nem força uma negativa sem evidência suficiente. Não é necessário escolher um valor institucional de período/mínimo para implementar o mecanismo configurável.

Ratificação institucional de composição familiar e organização de projetos continua em DEC-01/04; período/mínimo/atividades de aptidão, em DEC-02; campo a campo da ficha, finalidades, guarda, acesso a dados reais e enquadramento institucional, em DEC-05/08; volumes/metas/implantação, em DEC-10. Desenvolvimento e demonstração usam dados sintéticos; a liberação real depende da decisão pertinente. A escolha do desenho pelo responsável pelo projeto não declara aprovação institucional em nome da instituição.

## 4. Sequência de implementação deste repositório

1. CORE (fundação: tipos, transações, envelopes, auditoria) — CONCLUÍDO
2. ACS/AUD (auth, perfis, middleware, auditoria transacional) — CONCLUÍDO (parcial)
3. ATD (atendimentos pontuais, visita domiciliar) — EM ANDAMENTO
4. CAD (cadastro de pessoas, famílias, vínculos)
5. EST (estoque social: itens, entradas, saldo, ajustes)
6. BAZ (recebimento do Bazar)
7. ENT (entregas às famílias — depende de ATD + EST + contrato EligibilityGateway)
8. REL (relatórios RF-REL-05 e RF-REL-06)

Detalhe por fase em [ROADMAP-AD](../ROADMAP-AD.md). A entrega (ENT) depende do contrato real de aptidão do repositório FRQ; enquanto ele não existir, `PendingEligibilityGateway` mantém toda família Pendente (RN-18/LAC-01) e a entrega a família Pendente exige justificativa (RF-ENT-06).

## 5. Cobertura de aceite e prontidão

Cada arquivo define seus cenários observáveis e identifica fonte/ID. Cenários locais `*-ACnn` são derivados para implementação, não novos IDs oficiais do PRD. Cobertura de aceite neste repositório: AC-04/AC-16 (ATD), AC-11 (EST), AC-05/AC-06/AC-10 (ENT), AC-07 (BAZ). Aceites de FIC/FRQ/APT/MIG não são reivindicados aqui.

As escolhas locais que alteram os contratos estão fechadas na seção 3. Implementar os modelos/comandos/erros e cenários definidos, preservando os contratos entre módulos. Políticas ainda não escolhidas permanecem configuráveis/desativadas com resultado definido; sua ausência não autoriza inventar obrigatoriedade, valores de aptidão ou liberação de dados reais.

Uma implementação fica concluída quando entrega persistência, API e UI especificadas e passa pelos cenários aplicáveis. Uso real/piloto exige as decisões institucionais, matriz de campos/perfis e condições operacionais previstas nas fontes. Não declarar testes, migração, conformidade ou aprovação que ainda não ocorreram.
