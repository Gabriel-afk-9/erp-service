import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { registerPerson } from "../api/persons.api.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewPersonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialFamilyId = searchParams.get("familyId") ?? "";
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"" | "MALE" | "FEMALE" | "OTHER">("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [occupation, setOccupation] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [familyId, setFamilyId] = useState(initialFamilyId);
  const [validFrom, setValidFrom] = useState(today());
  const [relationship, setRelationship] = useState("");
  const [isReference, setIsReference] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await registerPerson({
        name: name.trim(),
        birthDate: birthDate || null,
        sex: sex || null,
        cpf: cpf.trim() || null,
        rg: rg.trim() || null,
        occupation: occupation.trim() || null,
        educationLevel: educationLevel.trim() || null,
        contactPhone: contactPhone.trim() || null,
        familyId: familyId.trim(),
        validFrom,
        relationshipToReference: relationship.trim() || null,
        isReference,
      });
      navigate(`/families/${familyId.trim()}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Nova pessoa</h2>
      <form onSubmit={handleSubmit} className="mt-4 rounded bg-white p-4 shadow">
        <div className="grid gap-3">
          <label className="block text-sm">Nome *<input className="mt-1 w-full rounded border px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></label>
          <label className="block text-sm">Data de nascimento<input type="date" className="mt-1 w-full rounded border px-2 py-1" value={birthDate} max={today()} onChange={(e) => setBirthDate(e.target.value)} /></label>
          <label className="block text-sm">Sexo<select className="mt-1 w-full rounded border px-2 py-1" value={sex} onChange={(e) => setSex(e.target.value as never)}><option value="">—</option><option value="MALE">Masculino</option><option value="FEMALE">Feminino</option><option value="OTHER">Outro</option></select></label>
          <label className="block text-sm">CPF<input className="mt-1 w-full rounded border px-2 py-1" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="apenas dígitos" /></label>
          <label className="block text-sm">RG<input className="mt-1 w-full rounded border px-2 py-1" value={rg} onChange={(e) => setRg(e.target.value)} /></label>
          <label className="block text-sm">Ocupação<input className="mt-1 w-full rounded border px-2 py-1" value={occupation} onChange={(e) => setOccupation(e.target.value)} /></label>
          <label className="block text-sm">Escolaridade<input className="mt-1 w-full rounded border px-2 py-1" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} /></label>
          <label className="block text-sm">Telefone<input className="mt-1 w-full rounded border px-2 py-1" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></label>
          <label className="block text-sm">Família (ID) *<input className="mt-1 w-full rounded border px-2 py-1" value={familyId} onChange={(e) => setFamilyId(e.target.value)} required /></label>
          <label className="block text-sm">Início do vínculo *<input type="date" className="mt-1 w-full rounded border px-2 py-1" value={validFrom} max={today()} onChange={(e) => setValidFrom(e.target.value)} required /></label>
          <label className="block text-sm">Parentesco<input className="mt-1 w-full rounded border px-2 py-1" value={relationship} onChange={(e) => setRelationship(e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isReference} onChange={(e) => setIsReference(e.target.checked)} /> Titular da família</label>
        </div>
        {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
        <button type="submit" disabled={loading} className="mt-4 rounded bg-gray-800 px-4 py-2 text-white">{loading ? "Cadastrando..." : "Cadastrar pessoa"}</button>
      </form>
    </div>
  );
}
