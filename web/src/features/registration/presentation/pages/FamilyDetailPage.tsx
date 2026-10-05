import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmModal } from "../../../../shared/presentation/components/ConfirmModal.js";
import { addFamilyMember, closeMembership, correctFamily, getFamily, type FamilyDetail } from "../api/families.api.js";
import { searchPersons } from "../api/persons.api.js";
import { listDeliveries, type DeliveryListItem } from "../../../deliveries/presentation/api/deliveries.api.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [editFields, setEditFields] = useState({ referenceName: "", address: "", neighborhood: "", postalCode: "", contactPhone: "", locationType: "URBAN" });
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<{ personId: string; name: string; currentFamilyCode: string | null }[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [validFrom, setValidFrom] = useState(today());
  const [relationship, setRelationship] = useState("");
  const [isReference, setIsReference] = useState(false);
  const [closureTarget, setClosureTarget] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryListItem[]>([]);

  async function load(): Promise<void> {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getFamily(id);
      setFamily(data);
      setEditFields({
        referenceName: data.referenceName ?? "",
        address: data.address ?? "",
        neighborhood: data.neighborhood ?? "",
        postalCode: data.postalCode ?? "",
        contactPhone: data.contactPhone ?? "",
        locationType: data.locationType,
      });
      try {
        setDeliveries((await listDeliveries(id)).deliveries);
      } catch {
        setDeliveries([]);
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
    if (!family) return;
    setLoading(true);
    try {
      await correctFamily(family.familyId, {
        referenceName: editFields.referenceName.trim() || null,
        address: editFields.address.trim() || null,
        neighborhood: editFields.neighborhood.trim() || null,
        postalCode: editFields.postalCode.trim() || null,
        locationType: editFields.locationType === "RURAL" ? "RURAL" : "URBAN",
        contactPhone: editFields.contactPhone.trim() || null,
        reason: editReason.trim(),
        expectedRevision: family.revision,
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

  async function handleSearchPerson(): Promise<void> {
    try {
      const result = await searchPersons({ q: addQuery.trim() || undefined });
      setAddResults(result.items.map((p) => ({ personId: p.personId, name: p.name, currentFamilyCode: p.currentFamilyCode })));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    }
  }

  async function handleAddMember(): Promise<void> {
    if (!family || !selectedPersonId) return;
    setLoading(true);
    try {
      await addFamilyMember(family.familyId, { personId: selectedPersonId, validFrom, relationshipToReference: relationship.trim() || null, isReference });
      setSelectedPersonId("");
      setAddQuery("");
      setAddResults([]);
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleClosure(values: Record<string, string>): Promise<void> {
    if (!closureTarget || !family) return;
    const target = family.members.find((m) => m.membershipId === closureTarget);
    if (!target) return;
    setLoading(true);
    try {
      await closeMembership(closureTarget, { validUntil: values.validUntil ?? today(), reason: values.reason ?? "", expectedRevision: target.revision });
      setClosureTarget(null);
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (!family && loading) return <p className="text-sm">Carregando...</p>;
  if (!family) return <p className="text-sm text-red-700">{feedback ?? "Família não encontrada"}</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Família {family.code}</h2>
        <Link to="/families" className="text-sm text-blue-700 underline">Voltar</Link>
      </div>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <p className="text-sm"><span className="font-semibold">Referência:</span> {family.referenceName ?? "—"}</p>
        <p className="text-sm"><span className="font-semibold">Endereço:</span> {family.address ?? "—"} — {family.neighborhood ?? "—"} ({family.postalCode ?? "—"})</p>
        <p className="text-sm"><span className="font-semibold">Localidade:</span> {family.locationType === "URBAN" ? "Urbano" : "Rural"} — <span className="font-semibold">Telefone:</span> {family.contactPhone ?? "—"}</p>
        <p className="text-sm"><span className="font-semibold">Membros vigentes:</span> {family.memberCount} — <span className="font-semibold">Revisão:</span> {family.revision}</p>
        <button type="button" onClick={() => setEditing((v) => !v)} className="mt-3 rounded bg-gray-200 px-3 py-1 text-sm">Editar</button>
        {editing ? (
          <div className="mt-3 grid gap-2 border-t pt-3">
            <input className="rounded border px-2 py-1 text-sm" placeholder="Referência" value={editFields.referenceName} onChange={(e) => setEditFields({ ...editFields, referenceName: e.target.value })} />
            <input className="rounded border px-2 py-1 text-sm" placeholder="Endereço" value={editFields.address} onChange={(e) => setEditFields({ ...editFields, address: e.target.value })} />
            <input className="rounded border px-2 py-1 text-sm" placeholder="Bairro" value={editFields.neighborhood} onChange={(e) => setEditFields({ ...editFields, neighborhood: e.target.value })} />
            <input className="rounded border px-2 py-1 text-sm" placeholder="CEP" value={editFields.postalCode} onChange={(e) => setEditFields({ ...editFields, postalCode: e.target.value })} />
            <input className="rounded border px-2 py-1 text-sm" placeholder="Telefone" value={editFields.contactPhone} onChange={(e) => setEditFields({ ...editFields, contactPhone: e.target.value })} />
            <select className="rounded border px-2 py-1 text-sm" value={editFields.locationType} onChange={(e) => setEditFields({ ...editFields, locationType: e.target.value })}>
              <option value="URBAN">Urbano</option>
              <option value="RURAL">Rural</option>
            </select>
            <input className="rounded border px-2 py-1 text-sm" placeholder="Motivo (mín 3)" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            <button type="button" disabled={loading || editReason.trim().length < 3} onClick={() => void handleCorrect()} className="rounded bg-gray-800 px-4 py-2 text-sm text-white">Salvar correção</button>
          </div>
        ) : null}
      </div>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-6 rounded bg-white p-4 shadow">
        <h3 className="font-semibold">Membros</h3>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pr-2">Nome</th>
              <th className="pr-2">Vínculo</th>
              <th className="pr-2">Início</th>
              <th className="pr-2">Fim</th>
              <th className="pr-2">Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {family.members.map((member) => (
              <tr key={member.membershipId} className="border-t">
                <td className="pr-2">{member.personName}{member.isReference ? " (titular)" : ""}</td>
                <td className="pr-2">{member.relationshipToReference ?? "—"}</td>
                <td className="pr-2">{member.validFrom}</td>
                <td className="pr-2">{member.validUntil ?? "—"}</td>
                <td className="pr-2">{member.isActive ? "Vigente" : "Encerrado"}</td>
                <td>{member.isActive ? <button type="button" onClick={() => setClosureTarget(member.membershipId)} className="rounded bg-red-100 px-2 py-1 text-red-800">Encerrar</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 rounded bg-white p-4 shadow">
        <h3 className="font-semibold">Adicionar membro existente</h3>
        <div className="mt-2 flex gap-2">
          <input className="w-full rounded border px-2 py-1 text-sm" placeholder="Buscar pessoa por nome/CPF" value={addQuery} onChange={(e) => setAddQuery(e.target.value)} />
          <button type="button" onClick={() => void handleSearchPerson()} className="rounded bg-gray-200 px-3 py-1 text-sm">Buscar</button>
        </div>
        {addResults.length > 0 ? (
          <select className="mt-2 w-full rounded border px-2 py-1 text-sm" value={selectedPersonId} onChange={(e) => setSelectedPersonId(e.target.value)}>
            <option value="">Selecione</option>
            {addResults.map((person) => (
              <option key={person.personId} value={person.personId}>{person.name} — família atual: {person.currentFamilyCode ?? "—"}</option>
            ))}
          </select>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <input type="date" className="rounded border px-2 py-1 text-sm" value={validFrom} max={today()} onChange={(e) => setValidFrom(e.target.value)} />
          <input className="rounded border px-2 py-1 text-sm" placeholder="Parentesco com titular" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={isReference} onChange={(e) => setIsReference(e.target.checked)} /> Titular</label>
          <button type="button" disabled={loading || !selectedPersonId} onClick={() => void handleAddMember()} className="rounded bg-gray-800 px-3 py-1 text-sm text-white">Adicionar</button>
        </div>
        <Link to={`/persons/new?familyId=${family.familyId}`} className="mt-3 inline-block text-sm text-blue-700 underline">+ Cadastrar nova pessoa nesta família</Link>
      </div>
      <ConfirmModal
        open={closureTarget !== null}
        title="Encerrar vínculo"
        fields={[
          { label: "Data de encerramento", name: "validUntil", required: true, type: "text", defaultValue: today() },
          { label: "Motivo (mín 3 caracteres)", minLength: 3, name: "reason", required: true, type: "textarea" },
        ]}
        confirmLabel="Confirmar"
        danger
        onCancel={() => setClosureTarget(null)}
        onConfirm={(values) => void handleClosure(values)}
      />
      <div className="mt-6 rounded bg-white p-4 shadow">
        <h3 className="font-semibold">Entregas</h3>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left"><th className="pr-2">Data</th><th className="pr-2">Status</th><th>Ações</th></tr></thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.deliveryId} className="border-t">
                <td className="pr-2">{delivery.occurredAt.slice(0, 10)}</td>
                <td className="pr-2">{delivery.status === "COMPLETED" ? "Concluída" : "Estornada"}</td>
                <td><Link to={`/deliveries/${delivery.deliveryId}`} className="text-blue-700 underline">Ver</Link></td>
              </tr>
            ))}
            {deliveries.length === 0 ? <tr><td colSpan={3} className="py-4 text-center text-gray-500">Nenhuma entrega registrada</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
