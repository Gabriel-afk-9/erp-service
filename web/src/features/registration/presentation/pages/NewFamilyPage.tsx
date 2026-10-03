import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFamily } from "../api/families.api.js";

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
      setFeedback(error instanceof Error ? error.message : "Erro inesperado");
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
            <input className="mt-1 w-full rounded border px-2 py-1" value={referenceName} onChange={(e) => setReferenceName(e.target.value)} />
          </label>
          <label className="block text-sm">
            Endereço
            <input className="mt-1 w-full rounded border px-2 py-1" value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label className="block text-sm">
            Bairro
            <input className="mt-1 w-full rounded border px-2 py-1" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          </label>
          <label className="block text-sm">
            CEP (8 dígitos)
            <input className="mt-1 w-full rounded border px-2 py-1" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="60000001" />
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
            <input className="mt-1 w-full rounded border px-2 py-1" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </label>
        </div>
        {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
        <button type="submit" disabled={loading} className="mt-4 rounded bg-gray-800 px-4 py-2 text-white">
          {loading ? "Cadastrando..." : "Cadastrar família"}
        </button>
      </form>
    </div>
  );
}
