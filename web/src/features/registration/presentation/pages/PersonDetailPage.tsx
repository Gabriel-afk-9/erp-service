import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { correctPerson, getPerson, type PersonDetail } from "../api/persons.api.js";
import { getFamily } from "../api/families.api.js";

function show(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [familyNeighborhood, setFamilyNeighborhood] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [editFields, setEditFields] = useState({ name: "", contactPhone: "", occupation: "", educationLevel: "" });

  async function load(): Promise<void> {
    if (!id) return;
    setLoading(true);
    setFeedback(null);
    try {
      const data = await getPerson(id);
      setPerson(data);
      setEditFields({
        name: data.name ?? "",
        contactPhone: data.contactPhone ?? "",
        occupation: data.occupation ?? "",
        educationLevel: data.educationLevel ?? "",
      });
      if (data.currentFamilyId) {
        try {
          const family = await getFamily(data.currentFamilyId);
          setFamilyNeighborhood(family.neighborhood);
        } catch {
          setFamilyNeighborhood(null);
        }
      } else {
        setFamilyNeighborhood(null);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function handleCorrect(): Promise<void> {
    if (!person) return;
    setLoading(true);
    try {
      await correctPerson(person.personId, {
        name: editFields.name.trim() || undefined,
        contactPhone: editFields.contactPhone.trim() || null,
        occupation: editFields.occupation.trim() || null,
        educationLevel: editFields.educationLevel.trim() || null,
        reason: editReason.trim(),
        expectedRevision: person.revision,
      });
      setEditing(false);
      setEditReason("");
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (!person && loading) return <p className="text-sm">Carregando...</p>;
  if (!person) return <p className="text-sm text-red-700">{feedback ?? "Pessoa não encontrada"}</p>;

  return (
    <div>
      <Link to="/persons" className="text-sm text-blue-700 underline">
        ← Voltar para pessoas
      </Link>
      <h2 className="mt-2 text-xl font-bold">{person.name}</h2>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <dl className="grid gap-2 text-sm">
          <div><dt className="font-bold">Nascimento</dt><dd>{show(person.birthDate?.slice(0, 10) ?? null)}</dd></div>
          <div><dt className="font-bold">Sexo</dt><dd>{show(person.sex)}</dd></div>
          <div><dt className="font-bold">CPF</dt><dd>{show(person.cpf)}</dd></div>
          <div><dt className="font-bold">RG</dt><dd>{show(person.rg)}</dd></div>
          <div><dt className="font-bold">Ocupação</dt><dd>{show(person.occupation)}</dd></div>
          <div><dt className="font-bold">Escolaridade</dt><dd>{show(person.educationLevel)}</dd></div>
          <div><dt className="font-bold">Telefone</dt><dd>{show(person.contactPhone)}</dd></div>
        </dl>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="mt-4 rounded bg-gray-200 px-4 py-2 text-sm">
            Editar
          </button>
        ) : (
          <div className="mt-4 grid gap-2">
            <input className="rounded border px-3 py-2 text-sm" placeholder="Nome" value={editFields.name} onChange={(e) => setEditFields({ ...editFields, name: e.target.value })} />
            <input className="rounded border px-3 py-2 text-sm" placeholder="Telefone" value={editFields.contactPhone} onChange={(e) => setEditFields({ ...editFields, contactPhone: e.target.value })} />
            <input className="rounded border px-3 py-2 text-sm" placeholder="Ocupação" value={editFields.occupation} onChange={(e) => setEditFields({ ...editFields, occupation: e.target.value })} />
            <input className="rounded border px-3 py-2 text-sm" placeholder="Escolaridade" value={editFields.educationLevel} onChange={(e) => setEditFields({ ...editFields, educationLevel: e.target.value })} />
            <input className="rounded border px-3 py-2 text-sm" placeholder="Motivo da correção (mín. 3 letras)" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleCorrect()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white" disabled={loading || editReason.trim().length < 3}>
                Salvar
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded bg-gray-200 px-4 py-2 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <h3 className="font-bold">Vínculo atual</h3>
        {person.currentFamilyId ? (
          <div className="mt-2 text-sm">
            <p>Família: {person.currentFamilyCode ?? "—"} {familyNeighborhood ? `— ${familyNeighborhood}` : ""}</p>
            <Link to={`/families/${person.currentFamilyId}`} className="text-blue-700 underline">
              Ver família
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Sem vínculo vigente. O histórico completo aparece na página da família.</p>
        )}
      </div>
    </div>
  );
}
