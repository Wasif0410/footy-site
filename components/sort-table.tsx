"use client";
// A table you can sort by any column (player stats, season stats). Rows arrive already rendered;
// each says how to sort by every column. Columns may be grouped under a heading ("Passing", ...).
import { useMemo, useState, type ReactNode } from "react";

export type Column = { key: string; label: string; title?: string; numeric?: boolean; group?: string };
export type Row = { id: string | number; cells: Record<string, ReactNode>; sort: Record<string, number | string | null> };

export function SortTable({ columns, rows, initial, caption }: { columns: Column[]; rows: Row[]; initial: string; caption?: string }) {
  const [by, setBy] = useState(initial);
  const [desc, setDesc] = useState(true);
  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const x = a.sort[by], y = b.sort[by];
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return desc ? -c : c;
    });
    return out;
  }, [rows, by, desc]);
  // the group heading row: consecutive columns with the same group share one heading
  const groups: { label: string; span: number }[] = [];
  columns.forEach((c) => {
    const g = c.group ?? "";
    const last = groups[groups.length - 1];
    if (last && last.label === g) last.span += 1; else groups.push({ label: g, span: 1 });
  });
  const grouped = columns.some((c) => c.group);
  return (
    <div className="table-wrap">
      <table>
        {caption ? <caption className="muted small" style={{ textAlign: "left", captionSide: "bottom", paddingTop: "0.8rem" }}>{caption}</caption> : null}
        <thead>
          {grouped ? (
            <tr className="groups">
              {groups.map((g, i) => <th key={i} colSpan={g.span} className={g.label ? "g" : undefined} scope="colgroup">{g.label}</th>)}
            </tr>
          ) : null}
          <tr>
            {columns.map((c, i) => (
              <th key={c.key} scope="col" title={c.title} className={i === 0 ? "sticky" : undefined}
                aria-sort={by === c.key ? (desc ? "descending" : "ascending") : undefined}>
                <button type="button" onClick={() => { if (by === c.key) setDesc(!desc); else { setBy(c.key); setDesc(c.numeric !== false); } }}>
                  {c.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              {columns.map((c, i) => (
                <td key={c.key} className={[i === 0 ? "sticky" : "", by === c.key && i ? "lead" : ""].join(" ").trim() || undefined}>{r.cells[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
