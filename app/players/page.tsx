import type { Metadata } from "next";
import Link from "next/link";
import { Rating } from "@/components/ui";
import { players, season } from "@/lib/data";
import { fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Players" };

export default function Players() {
  const rows = new Map(season().map((r) => [r.player_id, r]));
  const squad = [...players()].sort((a, b) => (a.keeper === b.keeper ? (a.number ?? 99) - (b.number ?? 99) : a.keeper ? -1 : 1));
  return (
    <main className="wrap">
      <h1 style={{ fontSize: "2.4rem", marginBottom: "1.25rem" }}>Squad</h1>
      <div className="cards">
        {squad.map((p) => {
          const r = rows.get(p.id);
          return (
            <Link className="card" key={p.id} href={`/players/${p.slug}/`}>
              <div className="photo" style={{ backgroundImage: p.photo ? `url(${p.photo})` : undefined }}>
                <span className="shirt">{p.number ?? ""}</span>
                {r ? <Rating value={r.avg_rating} /> : null}
              </div>
              <div className="body">
                <strong>{p.name}</strong>
                <span className="muted small">
                  {p.keeper ? "Goalkeeper · " : ""}{r ? `${r.matches} match${r.matches === 1 ? "" : "es"} · ${fmt(r.minutes)} min` : "No minutes yet"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
