import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Plus, LayoutGrid, List, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { AssetCard } from '../components/ui/AssetCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activo, EstadoActivo } from '../data/types';

const ESTADOS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'normal', label: 'Normal' },
  { value: 'alerta', label: 'Alerta' },
  { value: 'critico', label: 'Crítico' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
];

export const Activos: React.FC = () => {
  const {
    activos, mediciones, sectores, tipos, tecnicos,
    addActivo, updateActivo,
    getSectorNombre, getTipoNombre, getTecnicoNombre,
  } = useActivos();
  const navigate = useNavigate();
  const location = useLocation();

  const sectoresActivos = sectores.filter((s) => s.activo);
  const tiposActivos = tipos.filter((t) => t.activo);
  const tecnicosActivos = tecnicos.filter((t) => t.activo);

  const emptyActivo: Omit<Activo, 'id'> = {
    codigo: '',
    nombre: '',
    tipoId: tiposActivos[0]?.id ?? '',
    sectorId: sectoresActivos[0]?.id ?? '',
    marca: '',
    modelo: '',
    fechaIngreso: format(new Date(), 'yyyy-MM-dd'),
    ubicacion: '',
    responsableId: tecnicosActivos[0]?.id ?? '',
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

  const [search, setSearch] = useState('');
  const [sectorFiltro, setSectorFiltro] = useState('Todos');
  const [estado, setEstado] = useState('todos');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [sort, setSort] = useState('estado');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Activo, 'id'>>(emptyActivo);

  const filtered = activos
    .filter((a) => {
      const matchSearch =
        a.nombre.toLowerCase().includes(search.toLowerCase()) ||
        a.codigo.toLowerCase().includes(search.toLowerCase());
      const matchSector = sectorFiltro === 'Todos' || a.sectorId === sectorFiltro;
      const matchEstado = estado === 'todos' || a.estado === estado;
      return matchSearch && matchSector && matchEstado;
    })
    .sort((a, b) => {
      if (sort === 'estado') {
        const order = { critico: 0, alerta: 1, mantenimiento: 2, normal: 3 };
        return order[a.estado] - order[b.estado];
      }
      if (sort === 'nombre') return a.nombre.localeCompare(b.nombre);
      if (sort === 'sector') return getSectorNombre(a.sectorId).localeCompare(getSectorNombre(b.sectorId));
      return 0;
    });

  const openNew = () => { setEditId(null); setForm(emptyActivo); setShowModal(true); };
  const openEdit = (a: Activo) => {
    const { id, ...rest } = a;
    void id;
    setEditId(a.id);
    setForm(rest);
    setShowModal(true);
  };

  // Abrir modal en modo edición cuando se navega desde el detalle del activo
  useEffect(() => {
    const editIdFromState = (location.state as { editId?: string } | null)?.editId;
    if (editIdFromState) {
      const target = activos.find((a) => a.id === editIdFromState);
      if (target) openEdit(target);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateActivo(editId, form);
    } else {
      addActivo({ ...form, id: `act-${Date.now()}` });
    }
    setShowModal(false);
    setEditId(null);
    setForm(emptyActivo);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="font-sketch text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Activos</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} activos encontrados</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 min-h-[44px] font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition-all"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo Activo</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-11 flex-1 min-w-0 w-full sm:w-auto sm:min-w-48">
          <Search size={15} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 outline-none text-sm"
          />
        </div>
        <select
          value={sectorFiltro}
          onChange={(e) => setSectorFiltro(e.target.value)}
          className="border-2 border-slate-300 px-3 h-11 text-sm font-semibold outline-none flex-1 sm:flex-none min-w-0"
        >
          <option value="Todos">Todos los sectores</option>
          {sectoresActivos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="border-2 border-slate-300 px-3 h-11 text-sm font-semibold outline-none flex-1 sm:flex-none min-w-0"
        >
          {ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border-2 border-slate-300 px-3 h-11 text-sm font-semibold outline-none flex-1 sm:flex-none min-w-0"
        >
          <option value="estado">Ordenar: Estado</option>
          <option value="nombre">Ordenar: Nombre</option>
          <option value="sector">Ordenar: Sector</option>
        </select>
        <div className="flex border-2 border-slate-300 h-11">
          <button
            onClick={() => setView('grid')}
            className={`px-3 ${view === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('table')}
            className={`px-3 ${view === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
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
            return (
              <AssetCard
                key={activo.id}
                activo={activo}
                lastMedicion={lastMed}
                sectorNombre={getSectorNombre(activo.sectorId)}
                responsableNombre={getTecnicoNombre(activo.responsableId)}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                {['Código', 'Nombre', 'Tipo', 'Sector', 'Responsable', 'Estado', 'Próx. Mant.'].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-black uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/activos/${a.id}`)}
                  className={`border-b border-slate-100 hover:bg-orange-50 cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                >
                  <td className="px-3 py-2 font-mono font-bold text-slate-800 whitespace-nowrap">{a.codigo}</td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{a.nombre}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{getTipoNombre(a.tipoId)}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{getSectorNombre(a.sectorId)}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{getTecnicoNombre(a.responsableId)}</td>
                  <td className="px-3 py-2"><StatusBadge estado={a.estado} size="sm" /></td>
                  <td className="px-3 py-2 text-slate-600 font-mono text-xs whitespace-nowrap">{a.proximoMantenimiento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border-2 border-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-slate-900 text-white sticky top-0 z-10">
              <h2 className="font-black uppercase tracking-wide">{editId ? 'Editar Activo' : 'Nuevo Activo'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Código', key: 'codigo', required: true },
                { label: 'Nombre', key: 'nombre', required: true },
                { label: 'Marca', key: 'marca' },
                { label: 'Modelo', key: 'modelo' },
                { label: 'Ubicación', key: 'ubicacion' },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">{label}</label>
                  <input
                    type="text"
                    required={required}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Responsable</label>
                <select
                  value={form.responsableId}
                  onChange={(e) => setForm((prev) => ({ ...prev, responsableId: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500"
                >
                  <option value="">Sin asignar</option>
                  {tecnicosActivos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Tipo</label>
                <select
                  value={form.tipoId}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipoId: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500"
                >
                  {tiposActivos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Sector</label>
                <select
                  value={form.sectorId}
                  onChange={(e) => setForm((prev) => ({ ...prev, sectorId: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500"
                >
                  {sectoresActivos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Estado Inicial</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value as EstadoActivo }))}
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500"
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
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Próximo Mantenimiento</label>
                <input
                  type="date"
                  value={form.proximoMantenimiento}
                  onChange={(e) => setForm((prev) => ({ ...prev, proximoMantenimiento: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                  rows={2}
                  className="w-full border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              {/* Parámetros de medición */}
              <ParametrosMedicion form={form} setForm={setForm} />

              <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" className="px-4 min-h-[44px] bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">
                  {editId ? 'Guardar Cambios' : 'Crear Activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Componente de parámetros de medición (colapsable) ────────────────────────
type FormActivo = Omit<Activo, 'id'>;

const CampoNum: React.FC<{
  label: string;
  campo: keyof FormActivo;
  form: FormActivo;
  setForm: React.Dispatch<React.SetStateAction<FormActivo>>;
  unidad?: string;
}> = ({ label, campo, form, setForm, unidad }) => (
  <div>
    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
      {label}{unidad && <span className="text-slate-400 font-normal normal-case"> ({unidad})</span>}
    </label>
    <input
      type="number"
      value={(form[campo] as number) ?? ''}
      onChange={(e) => setForm((prev) => ({ ...prev, [campo]: e.target.value === '' ? null : Number(e.target.value) }))}
      className="w-full border-2 border-slate-300 px-3 h-10 text-sm outline-none focus:border-orange-500"
    />
  </div>
);

const ParametrosMedicion: React.FC<{
  form: FormActivo;
  setForm: React.Dispatch<React.SetStateAction<FormActivo>>;
}> = ({ form, setForm }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="sm:col-span-2 border-2 border-slate-200">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-xs font-black uppercase tracking-wider text-slate-600">
          Parámetros de medición y alertas
        </span>
        {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {abierto && (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-black uppercase tracking-wider text-orange-600 mb-2">Temperatura</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CampoNum label="Mín normal" campo="temperaturaMin" form={form} setForm={setForm} unidad="°C" />
              <CampoNum label="Máx normal" campo="temperaturaMax" form={form} setForm={setForm} unidad="°C" />
              <CampoNum label="Alerta"     campo="temperaturaAlerta"   form={form} setForm={setForm} unidad="°C" />
              <CampoNum label="Crítica"    campo="temperaturaCritica"  form={form} setForm={setForm} unidad="°C" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-black uppercase tracking-wider text-orange-600 mb-2 mt-2">Otros parámetros</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <CampoNum label="Amperaje normal"  campo="amperajeNormal"  form={form} setForm={setForm} unidad="A" />
              <CampoNum label="Presión normal"   campo="presionNormal"   form={form} setForm={setForm} unidad="bar" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-black uppercase tracking-wider text-orange-600 mb-2 mt-2">Intervalos de mantenimiento</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <CampoNum label="Medición c/"     campo="intervaloMedicionHoras"     form={form} setForm={setForm} unidad="hs" />
              <CampoNum label="Lubricación c/"  campo="intervaloLubricacionHoras"  form={form} setForm={setForm} unidad="hs" />
              <CampoNum label="Rodamientos c/"  campo="intervaloRodamientoHoras"   form={form} setForm={setForm} unidad="hs" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
