import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFamily, searchFamilies } from "../api/families.api.js";
import { translateRegistrationError } from "../api/registration-errors.js";

export function NewFamilyPage() {
  const navigate = useNavigate();
  const [referenceName, setReferenceName] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locationType, setLocationType] = useState<"URBAN" | "RURAL">("URBAN");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);

  async function handleDuplicateCheck(): Promise<void> {
    setDuplicateHint(null);
    const term = referenceName.trim() || neighborhood.trim() || address.trim();
    if (term.length < 2) {
      setDuplicateHint("Digite ao menos 2 letras para verificar famílias parecidas.");
      return;
    }
    try {
      const result = await searchFamilies({ q: term });
      setDuplicateHint(
        result.items.length === 0
          ? "Nenhuma família parecida encontrada."
          : `${result.items.length} família(s) parecida(s) encontrada(s). Confira antes de cadastrar.`,
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
      const result = await createFamily({
        referenceName: referenceName.trim() || null,
        address: address.trim() || null,
        neighborhood: neighborhood.trim() || null,
        postalCode: postalCode.trim() || null,
        locationType,
        contactPhone: contactPhone.trim() || null,
      });
      navigate(`/families/${result.familyId}`);
    } catch (error) {
      setFeedback(translateRegistrationError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Nova família</h2>
      <form onSubmit={handleSubmit} className="mt-4 rounded bg-white p-4 shadow">
        <div className="grid gap-3">
          <label className="block text-sm">
            Nome de referência
            <input className="mt-1 w-full rounded border px-2 py-1" value={referenceName} onChange={(e) => setReferenceName(e.target.value)} maxLength={500} />
          </label>
          <label className="block text-sm">
            Endereço
            <input className="mt-1 w-full rounded border px-2 py-1" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} />
          </label>
          <label className="block text-sm">
            Bairro
            <input className="mt-1 w-full rounded border px-2 py-1" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={500} />
          </label>
          <label className="block text-sm">
            CEP (8 dígitos)
            <input className="mt-1 w-full rounded border px-2 py-1" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="60000001" inputMode="numeric" maxLength={50} />
          </label>
          <label className="block text-sm">
            Tipo de localidade
            <select className="mt-1 w-full rounded border px-2 py-1" value={locationType} onChange={(e) => setLocationType(e.target.value as "URBAN" | "RURAL")}>
              <option value="URBAN">Urbano</option>
              <option value="RURAL">Rural</option>
            </select>
          </label>
          <label className="block text-sm">
            Telefone
            <input className="mt-1 w-full rounded border px-2 py-1" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={50} />
          </label>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" onClick={() => void handleDuplicateCheck()} className="w-fit rounded bg-gray-200 px-3 py-1 text-sm">Verificar duplicados antes de cadastrar</button>
          {duplicateHint ? <p className="text-sm text-gray-700">{duplicateHint}</p> : null}
        </div>
        {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
        <button type="submit" disabled={loading} className="mt-4 rounded bg-gray-800 px-4 py-2 text-white">
          {loading ? "Cadastrando..." : "Cadastrar família"}
        </button>
      </form>
    </div>
  );
}
