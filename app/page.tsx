"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Package,
  Truck,
  Percent,
  Store,
  Search,
  UploadCloud,
  Loader2,
  ArrowRightLeft,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const BLUE = "#3B82F6";
const GREEN = "#22C55E";
const AMBER = "#F5A524";
const RED = "#EF4444";

const STATUS_COLOR: Record<string, string> = {
  Overfilled: AMBER,
  Completa: GREEN,
  Básico: BLUE,
  Undersized: RED,
};

interface Filtros {
  semanas: string[];
  paises: string[];
  departamentos: string[];
  tiendas: string[];
}

interface Summary {
  surtido: number;
  entrega: number;
  diferencia: number;
  fillRatePromedio: number;
  totalRegistros: number;
  tiendas: number;
  porClasificacion: { clasificacion: string; entrega: number; registros: number }[];
  porSemana: { semana: string; fillRate: number }[];
}

interface Row {
  id: number;
  semana: string;
  pais: string;
  tienda: string;
  departamento: string;
  categoria: string;
  subcategoria: string;
  surtido: number;
  entrega: number;
  diferencia: number;
  fillRate: number;
  clasificacion: string;
}

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function KpiCard({
  icon: Icon,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-[#1E2438] bg-[#12172A] p-4 flex items-center gap-3 min-w-0">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${iconColor}22` }}>
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[#8891A5] truncate">{label}</div>
        <div className="text-xl font-semibold text-[#E7E9F0] font-mono tabular-nums leading-tight">{value}</div>
        {sub && <div className="text-[11px] text-[#8891A5]">{sub}</div>}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative rounded-lg border border-[#1E2438] bg-[#12172A] px-3 py-1.5 flex items-center gap-3 text-xs">
      <div className="min-w-0">
        <div className="text-[#8891A5]">{label}</div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-[#E7E9F0] outline-none appearance-none pr-4 max-w-[140px]"
        >
          <option className="bg-[#12172A]" value="Todos">
            Todos
          </option>
          {options.map((o) => (
            <option className="bg-[#12172A]" key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <ChevronDown className="h-3.5 w-3.5 text-[#8891A5] absolute right-2" />
    </div>
  );
}

function MiniBar({ percent }: { percent: number }) {
  const capped = Math.min(Math.max(percent, 0), 100);
  return (
    <div className="h-1.5 w-16 rounded-full bg-[#1E2438] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${capped}%`, backgroundColor: BLUE }} />
    </div>
  );
}

export default function DashboardPage() {
  const [filtros, setFiltros] = useState<Filtros>({ semanas: [], paises: [], departamentos: [], tiendas: [] });
  const [semana, setSemana] = useState("Todos");
  const [pais, setPais] = useState("Todos");
  const [departamento, setDepartamento] = useState("Todos");
  const [tienda, setTienda] = useState("Todos");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fillrate/filtros")
      .then((r) => r.json())
      .then(setFiltros)
      .catch(() => {});
  }, []);

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (semana !== "Todos") p.set("semana", semana);
    if (pais !== "Todos") p.set("pais", pais);
    if (departamento !== "Todos") p.set("departamento", departamento);
    if (tienda !== "Todos") p.set("tienda", tienda);
    return p;
  }, [semana, pais, departamento, tienda]);

  useEffect(() => {
    setPage(1);
  }, [semana, pais, departamento, tienda, debouncedQuery]);

  useEffect(() => {
    fetch(`/api/fillrate/summary?${filterParams.toString()}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {});
  }, [filterParams]);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams(filterParams);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (debouncedQuery) p.set("q", debouncedQuery);

    fetch(`/api/fillrate?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setPageCount(data.pageCount ?? 1);
      })
      .finally(() => setLoading(false));
  }, [filterParams, page, debouncedQuery]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadMsg(`Error: ${data.error ?? "no se pudo cargar el archivo"}`);
      } else {
        setUploadMsg(
          `Cargado: ${data.filasInsertadas} filas de BASE_MAESTRA` +
            (data.mezcla ? `, ${data.mezcla.filasInsertadas} de DATO_MEZCLA` : "")
        );
        setPage(1);
        fetch(`/api/fillrate/summary?${filterParams.toString()}`).then((r) => r.json()).then(setSummary);
      }
    } catch (err) {
      setUploadMsg("Error de red al subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0A0E1A] text-[#E7E9F0] flex" style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <aside className="w-56 shrink-0 bg-[#0A0E1A] border-r border-[#1E2438] flex flex-col">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-[#1E2438]">
          <div className="h-8 w-8 rounded-lg bg-[#3B82F6]/15 flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-[#3B82F6]" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide leading-none">FILL RATE</div>
            <div className="text-[10px] text-[#8891A5] mt-0.5">Dashboard</div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5 text-sm">
          <a href="/" className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 bg-[#3B82F6]/15 text-[#3B82F6]">
            <LayoutGrid className="h-4 w-4" /> BASE_MAESTRA
          </a>
          <a href="/mezcla" className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[#8891A5] hover:bg-white/5">
            <ArrowRightLeft className="h-4 w-4" /> DATO_MEZCLA
          </a>
        </nav>
        <div className="p-3 border-t border-[#1E2438]">
          <label className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#3B82F6]/40 px-3 py-3 text-xs text-[#3B82F6] cursor-pointer hover:bg-[#3B82F6]/10">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {uploading ? "Cargando..." : "Subir Excel"}
            <input
              type="file"
              accept=".xlsx,.xls,.xlsb"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </label>
          {uploadMsg && <div className="text-[11px] text-[#8891A5] mt-2">{uploadMsg}</div>}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-[#1E2438] flex items-center px-6">
          <div>
            <div className="text-base font-semibold leading-tight">BASE_MAESTRA</div>
            <div className="text-xs text-[#8891A5]">Seguimiento de entregas, fill rate y cumplimiento</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect label="Semana" value={semana} options={filtros.semanas} onChange={setSemana} />
            <FilterSelect label="País" value={pais} options={filtros.paises} onChange={setPais} />
            <FilterSelect label="Departamento" value={departamento} options={filtros.departamentos} onChange={setDepartamento} />
            <FilterSelect label="Tienda" value={tienda} options={filtros.tiendas} onChange={setTienda} />
          </div>

          <div className="grid grid-cols-5 gap-3">
            <KpiCard icon={Package} iconColor={BLUE} label="Surtido" value={(summary?.surtido ?? 0).toLocaleString("es")} />
            <KpiCard icon={Truck} iconColor="#22D3EE" label="Entregado" value={(summary?.entrega ?? 0).toLocaleString("es")} />
            <KpiCard
              icon={ArrowRightLeft}
              iconColor={(summary?.diferencia ?? 0) < 0 ? RED : GREEN}
              label="Diferencia"
              value={`${(summary?.diferencia ?? 0) > 0 ? "+" : ""}${(summary?.diferencia ?? 0).toLocaleString("es")}`}
            />
            <KpiCard icon={Percent} iconColor={GREEN} label="Fill Rate" value={`${summary?.fillRatePromedio ?? 0}%`} />
            <KpiCard
              icon={Store}
              iconColor="#8B5CF6"
              label="Tiendas"
              value={String(summary?.tiendas ?? 0)}
              sub={`${(summary?.totalRegistros ?? 0).toLocaleString("es")} registros`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 rounded-xl border border-[#1E2438] bg-[#12172A] p-4">
              <div className="text-sm font-medium mb-3">Fill Rate por Semana</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={summary?.porSemana ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1E2438" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#8891A5" }} axisLine={{ stroke: "#1E2438" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8891A5" }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ background: "#12172A", border: "1px solid #1E2438", fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="fillRate" stroke={BLUE} strokeWidth={2} dot={{ r: 3, fill: BLUE }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-[#1E2438] bg-[#12172A] p-4">
              <div className="text-sm font-medium mb-3">Clasificación</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary?.porClasificacion ?? []} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#8891A5" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="clasificacion" tick={{ fontSize: 10, fill: "#8891A5" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={{ background: "#12172A", border: "1px solid #1E2438", fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="entrega" radius={[0, 4, 4, 0]}>
                    {(summary?.porClasificacion ?? []).map((c, i) => (
                      <Cell key={i} fill={STATUS_COLOR[c.clasificacion] ?? BLUE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-[#1E2438] bg-[#12172A]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2438]">
              <span className="text-sm font-medium">Detalle de Registros</span>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8891A5]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar tienda, categoría..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#0A0E1A] border border-[#1E2438] rounded-lg text-[#E7E9F0] placeholder:text-[#8891A5] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] w-56"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#8891A5] border-b border-[#1E2438]">
                    <th className="px-4 py-2.5 font-medium">Semana</th>
                    <th className="px-3 py-2.5 font-medium">País</th>
                    <th className="px-3 py-2.5 font-medium">Tienda</th>
                    <th className="px-3 py-2.5 font-medium">Departamento</th>
                    <th className="px-3 py-2.5 font-medium">Categoría</th>
                    <th className="px-3 py-2.5 font-medium text-right">Surtido</th>
                    <th className="px-3 py-2.5 font-medium text-right">Entregado</th>
                    <th className="px-3 py-2.5 font-medium text-right">Diferencia</th>
                    <th className="px-3 py-2.5 font-medium">Fill Rate</th>
                    <th className="px-3 py-2.5 font-medium">Clasificación</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-[#8891A5]">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Cargando...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-[#8891A5]">
                        Sin registros para estos filtros.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b border-[#161C2E] hover:bg-white/[0.03]">
                        <td className="px-4 py-2.5 font-mono text-[#8891A5]">{r.semana}</td>
                        <td className="px-3 py-2.5 text-[#8891A5]">{r.pais}</td>
                        <td className="px-3 py-2.5">{r.tienda}</td>
                        <td className="px-3 py-2.5 text-[#8891A5]">{r.departamento}</td>
                        <td className="px-3 py-2.5 text-[#8891A5]">{r.categoria}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{r.surtido.toLocaleString("es")}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{r.entrega.toLocaleString("es")}</td>
                        <td
                          className="px-3 py-2.5 text-right font-mono"
                          style={{ color: r.diferencia < 0 ? RED : r.diferencia > 0 ? GREEN : "#8891A5" }}
                        >
                          {r.diferencia > 0 ? "+" : ""}
                          {r.diferencia.toLocaleString("es")}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <MiniBar percent={r.fillRate} />
                            <span className="font-mono">{r.fillRate.toFixed(2)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${STATUS_COLOR[r.clasificacion] ?? BLUE}22`,
                              color: STATUS_COLOR[r.clasificacion] ?? BLUE,
                            }}
                          >
                            {r.clasificacion}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-xs text-[#8891A5]">
              <span>
                {total > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, total)} de {total.toLocaleString("es")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 w-7 rounded-md border border-[#1E2438] flex items-center justify-center hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-mono">
                  {page} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                  className="h-7 w-7 rounded-md border border-[#1E2438] flex items-center justify-center hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
