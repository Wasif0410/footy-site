"use client";
// A table you can sort by any column (box score, season stats). Rows arrive already rendered;
// each column says how to read a sortable value from a row.
import { useMemo, useState, type ReactNode } from "react";

export type Column = { key: string; label: string; title?: string; numeric?: boolean };
export type Row = { id: string | number; cells: Record<string, ReactNode>; sort: Record<string, number | string | null> };

export function SortTable({ columns, rows, initial, caption }: { columns: Column[]; rows: Row[]; initial: string; caption: string }) {
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
  return (
    <div className="table-wrap">
      <table>
        <caption className="muted small" style={{ textAlign: "left", captionSide: "bottom", paddingTop: "0.6rem" }}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" title={c.title} aria-sort={by === c.key ? (desc ? "descending" : "ascending") : undefined}>
                <button type="button" onClick={() => { if (by === c.key) setDesc(!desc); else { setBy(c.key); setDesc(c.numeric !== false); } }}>
                  {c.label}{by === c.key ? (desc ? " ▾" : " ▴") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>{columns.map((c) => <td key={c.key} className={by === c.key ? "lead" : undefined}>{r.cells[c.key]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
