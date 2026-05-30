import React, { useState } from 'react';
import { format } from 'date-fns';
import { Search, Plus, LayoutGrid, List, X } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { AssetCard } from '../components/ui/AssetCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activo, EstadoActivo, TipoActivo } from '../data/types';

const SECTORES = ['Todos', 'Planta', 'Taller', 'Pescadería', 'Frigorífico', 'Electricidad', 'Generación'];
const ESTADOS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'normal', label: 'Normal' },
  { value: 'alerta', label: 'Alerta' },
  { value: 'critico', label: 'Crítico' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
];

const emptyActivo: Omit<Activo, 'id'> = {
  codigo: '',
  nombre: '',
  tipo: 'motor',
  sector: 'Planta',
  marca: '',
  modelo: '',
  fechaIngreso: format(new Date(), 'yyyy-MM-dd'),
  ubicacion: '',
  responsable: '',
  horasActuales: 0,
  estado: 'normal',
  temperaturaMin: 20,
  temperaturaMax: 80,
  temperaturaAlerta: 85,
  temperaturaCritica: 95,
  amperajeNormal: 0,
  presionNormal: 0,
  intervaloMedicionHoras: 120,
  intervaloLubricacionHoras: 250,
  intervaloRodamientoHoras: 500,
  proximoMantenimiento: format(new Date(), 'yyyy-MM-dd'),
  notas: '',
};

export const Activos: React.FC = () => {
  const { activos, mediciones, addActivo } = useActivos();
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('Todos');
  const [estado, setEstado] = useState('todos');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [sort, setSort] = useState('estado');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Omit<Activo, 'id'>>(emptyActivo);

  const filtered = activos
    .filter((a) => {
      const matchSearch =
        a.nombre.toLowerCase().includes(search.toLowerCase()) ||
        a.codigo.toLowerCase().includes(search.toLowerCase());
      const matchSector = sector === 'Todos' || a.sector === sector;
      const matchEstado = estado === 'todos' || a.estado === estado;
      return matchSearch && matchSector && matchEstado;
    })
    .sort((a, b) => {
      if (sort === 'estado') {
        const order = { critico: 0, alerta: 1, mantenimiento: 2, normal: 3 };
        return order[a.estado] - order[b.estado];
      }
      if (sort === 'nombre') return a.nombre.localeCompare(b.nombre);
      if (sort === 'sector') return a.sector.localeCompare(b.sector);
      return 0;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addActivo({ ...form, id: `act-${Date.now()}` });
    setShowModal(false);
    setForm(emptyActivo);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Activos</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} activos encontrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition-all"
        >
          <Plus size={16} />
          Nuevo Activo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 border-2 border-slate-300 px-3 py-1.5 flex-1 min-w-48">
          <Search size={15} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm"
          />
        </div>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="border-2 border-slate-300 px-3 py-1.5 text-sm font-semibold outline-none"
        >
          {SECTORES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="border-2 border-slate-300 px-3 py-1.5 text-sm font-semibold outline-none"
        >
          {ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border-2 border-slate-300 px-3 py-1.5 text-sm font-semibold outline-none"
        >
          <option value="estado">Ordenar: Estado</option>
          <option value="nombre">Ordenar: Nombre</option>
          <option value="sector">Ordenar: Sector</option>
        </select>
        <div className="flex border-2 border-slate-300">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 ${view === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-1.5 ${view === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((activo) => {
            const lastMed = mediciones
              .filter((m) => m.activoId === activo.id)
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
            return <AssetCard key={activo.id} activo={activo} lastMedicion={lastMed} />;
          })}
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                {['Código', 'Nombre', 'Tipo', 'Sector', 'Responsable', 'Estado', 'Próx. Mant.'].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-black uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-b border-slate-100 hover:bg-orange-50 cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="px-3 py-2 font-mono font-bold text-slate-800">{a.codigo}</td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{a.nombre}</td>
                  <td className="px-3 py-2 text-slate-600 capitalize">{a.tipo.replace('_', ' ')}</td>
                  <td className="px-3 py-2 text-slate-600">{a.sector}</td>
                  <td className="px-3 py-2 text-slate-600">{a.responsable}</td>
                  <td className="px-3 py-2"><StatusBadge estado={a.estado} size="sm" /></td>
                  <td className="px-3 py-2 text-slate-600 font-mono text-xs">{a.proximoMantenimiento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-slate-900 text-white">
              <h2 className="font-black uppercase tracking-wide">Nuevo Activo</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Código', key: 'codigo', required: true },
                { label: 'Nombre', key: 'nombre', required: true },
                { label: 'Marca', key: 'marca' },
                { label: 'Modelo', key: 'modelo' },
                { label: 'Ubicación', key: 'ubicacion' },
                { label: 'Responsable', key: 'responsable' },
              ].map(({ label, key, required }) => (
                <div key={key} className="col-span-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">{label}</label>
                  <input
                    type="text"
                    required={required}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value as TipoActivo }))}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                >
                  {['motor', 'compresor', 'bomba', 'camara_frio', 'tablero', 'rodamiento', 'generador', 'otro'].map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Sector</label>
                <select
                  value={form.sector}
                  onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                >
                  {SECTORES.filter((s) => s !== 'Todos').map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Estado Inicial</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value as EstadoActivo }))}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                >
                  {['normal', 'alerta', 'critico', 'mantenimiento'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Fecha Ingreso</label>
                <input
                  type="date"
                  value={form.fechaIngreso}
                  onChange={(e) => setForm((prev) => ({ ...prev, fechaIngreso: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Próximo Mantenimiento</label>
                <input
                  type="date"
                  value={form.proximoMantenimiento}
                  onChange={(e) => setForm((prev) => ({ ...prev, proximoMantenimiento: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                  rows={2}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                />
              </div>
              <div className="col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border-2 border-slate-400 font-bold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">
                  Crear Activo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
