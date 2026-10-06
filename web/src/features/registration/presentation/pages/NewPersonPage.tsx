import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { registerPerson, searchPersons } from "../api/persons.api.js";
import { translateRegistrationError } from "../api/registration-errors.js";

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
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);

  async function handleDuplicateCheck(): Promise<void> {
    setDuplicateHint(null);
    const term = name.trim() || cpf.trim();
    if (term.length < 2) {
      setDuplicateHint("Digite ao menos 2 letras do nome ou o CPF para verificar duplicados.");
      return;
    }
    try {
      const result = await searchPersons({ q: term });
      setDuplicateHint(
        result.items.length === 0
          ? "Nenhum cadastro parecido encontrado."
          : `${result.items.length} cadastro(s) parecido(s) encontrado(s). Confira antes de cadastrar.`,
      );
    } catch (error) {
      setDuplicateHint(translateRegistrationError(error));
    }
  }

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
      setFeedback(translateRegistrationError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Nova pessoa</h2>
      <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-border bg-surface p-md">
        <div className="grid gap-3">
          <label className="block text-sm">Nome *<input className="mt-1 w-full rounded border px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={200} /></label>
          <label className="block text-sm">Data de nascimento<input type="date" className="mt-1 w-full rounded border px-2 py-1" value={birthDate} max={today()} onChange={(e) => setBirthDate(e.target.value)} /></label>
          <label className="block text-sm">Sexo<select className="mt-1 w-full rounded border px-2 py-1" value={sex} onChange={(e) => setSex(e.target.value as never)}><option value="">—</option><option value="MALE">Masculino</option><option value="FEMALE">Feminino</option><option value="OTHER">Outro</option></select></label>
          <label className="block text-sm">CPF<input className="mt-1 w-full rounded border px-2 py-1" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="apenas dígitos" inputMode="numeric" maxLength={50} /></label>
          <label className="block text-sm">RG<input className="mt-1 w-full rounded border px-2 py-1" value={rg} onChange={(e) => setRg(e.target.value)} maxLength={30} /></label>
          <label className="block text-sm">Ocupação<input className="mt-1 w-full rounded border px-2 py-1" value={occupation} onChange={(e) => setOccupation(e.target.value)} maxLength={100} /></label>
          <label className="block text-sm">Escolaridade<input className="mt-1 w-full rounded border px-2 py-1" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} maxLength={100} /></label>
          <label className="block text-sm">Telefone<input className="mt-1 w-full rounded border px-2 py-1" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={50} /></label>
          <label className="block text-sm">Família (ID) *<input className="mt-1 w-full rounded border px-2 py-1" value={familyId} onChange={(e) => setFamilyId(e.target.value)} required /></label>
          <label className="block text-sm">Início do vínculo *<input type="date" className="mt-1 w-full rounded border px-2 py-1" value={validFrom} max={today()} onChange={(e) => setValidFrom(e.target.value)} required /></label>
          <label className="block text-sm">Parentesco<input className="mt-1 w-full rounded border px-2 py-1" value={relationship} onChange={(e) => setRelationship(e.target.value)} maxLength={100} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isReference} onChange={(e) => setIsReference(e.target.checked)} /> Titular da família</label>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" onClick={() => void handleDuplicateCheck()} className="w-fit rounded bg-background border border-border px-3 py-1 text-sm">Verificar duplicados antes de cadastrar</button>
          {duplicateHint ? <p className="text-sm text-text">{duplicateHint}</p> : null}
        </div>
        {feedback ? <p className="mt-3 text-sm text-aptIneligibleText">{feedback}</p> : null}
        <button type="submit" disabled={loading} className="mt-4 rounded bg-primary-action px-4 py-2 text-white">{loading ? "Cadastrando..." : "Cadastrar pessoa"}</button>
      </form>
    </div>
  );
}
