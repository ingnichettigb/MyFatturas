import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";

export type SortDir = "asc" | "desc";
export type SortState = { key: string | null; dir: SortDir };

type Accessors<T> = Record<string, (row: T) => string | number | null | undefined>;

/** Ordina i record: 1° clic crescente, 2° clic decrescente, e così via a ogni campo. */
export function useSort<T>(rows: T[], accessors: Accessors<T>) {
  const [sort, setSort] = useState<SortState>({ key: null, dir: "asc" });

  // Gli accessor cambiano a ogni render: li teniamo in un ref per non ricalcolare inutilmente.
  const accRef = useRef(accessors);
  accRef.current = accessors;

  const onSort = (key: string) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const acc = accRef.current[sort.key];
    if (!acc) return rows;
    return [...rows].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      const avu = av == null || av === "";
      const bvu = bv == null || bv === "";
      // i valori vuoti vanno sempre in fondo
      if (avu && bvu) return 0;
      if (avu) return 1;
      if (bvu) return -1;
      let c: number;
      if (typeof av === "number" && typeof bv === "number") c = av - bv;
      else
        c = String(av).localeCompare(String(bv), "it", {
          numeric: true,
          sensitivity: "base",
        });
      return sort.dir === "asc" ? c : -c;
    });
  }, [rows, sort]);

  return { sorted, sort, onSort };
}

export function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  className?: string;
}) {
  const attivo = sort.key === sortKey;
  const Icon = !attivo ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        aria-label={`Ordina per ${label}`}
        className={`inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground ${
          attivo ? "font-semibold text-foreground" : ""
        }`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className={`size-3.5 shrink-0 ${attivo ? "" : "opacity-40"}`} />
      </button>
    </TableHead>
  );
}
