import type { Metadata } from "next";
import { ClipCard } from "@/components/ui";
import { match } from "@/lib/data";

export const metadata: Metadata = { title: "Highlights" };

export default async function Highlights({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const goals = m.goals.filter((g) => g.clip);
  const shots = m.timeline.filter((t) => t.kind === "shot" && t.clip);
  return (
    <div className="grid" style={{ gap: "0.5rem" }}>
      <h2>Goals</h2>
      <div className="clips">
        {goals.map((g, i) => (
          <ClipCard key={i} clip={g.clip!} min={g.minute}
            title={g.team === 0 ? `Goal · ${g.scorer?.name ?? "us"}` : `Goal · ${m.opponent}`}
            sub={g.team === 0 && g.assist ? `assist ${g.assist.name}` : undefined} />
        ))}
      </div>
      {shots.length ? (
        <>
          <h2 className="section-title">Shots</h2>
          <div className="clips">
            {shots.map((t, i) => (
              <ClipCard key={i} clip={t.clip!} min={t.minute}
                title={t.from?.team === 0 ? t.from.name : m.opponent} sub={t.on_target ? "on target" : "off target"} />
            ))}
          </div>
        </>
      ) : null}
      {!goals.length && !shots.length ? <p className="muted">No clips for this match yet.</p> : null}
    </div>
  );
}
