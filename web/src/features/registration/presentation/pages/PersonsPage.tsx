import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchPersons, type PersonListItem } from "../api/persons.api.js";
import { translateRegistrationError } from "../api/registration-errors.js";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function PersonsPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PersonListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load(query: string): Promise<void> {
    setLoading(true);
    setFeedback(null);
    try {
      const trimmed = query.trim();
      const result = await searchPersons({ q: trimmed === "" ? undefined : trimmed });
      setItems(result.items);
    } catch (error) {
      setFeedback(translateRegistrationError(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Pessoas</h2>
        <Link to="/persons/new" className="rounded bg-gray-800 px-4 py-2 text-sm text-white">
          + Cadastrar nova pessoa
        </Link>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Buscar por nome ou CPF (mín. 2 letras)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load(q);
          }}
        />
        <button type="button" onClick={() => void load(q)} className="rounded bg-gray-200 px-4 py-2" disabled={loading}>
          Buscar
        </button>
      </div>
      {feedback ? <p className="mt-3 text-sm text-red-700">{feedback}</p> : null}
      <div className="mt-4 rounded bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pr-2">Nome</th>
              <th className="pr-2">Nascimento</th>
              <th className="pr-2">Família atual</th>
              <th className="pr-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((person) => (
              <tr key={person.personId} className="border-t">
                <td className="pr-2">{person.name}</td>
                <td className="pr-2">{formatDate(person.birthDate)}</td>
                <td className="pr-2">{person.currentFamilyCode ?? "—"}</td>
                <td className="pr-2">
                  <Link to={`/persons/${person.personId}`} className="text-blue-700 underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">
                  Nenhuma pessoa encontrada
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
