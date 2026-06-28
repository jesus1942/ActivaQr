// v1.1.0
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Plus, LayoutGrid, List, X, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { exportarCsv } from '../utils/exportCsv';
import { useActivos } from '../hooks/useActivos';
import { useAuth } from '../context/AuthContext';
import { AssetCard } from '../components/ui/AssetCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ESTADOS_OPERATIVOS } from '../components/ui/EstadoOperativoBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Activo, EstadoActivo, EstadoOperativo } from '../data/types';

const LIMITES_ACTIVOS: Record<string, number | null> = {
  inicial:    10,
  empresa:    50,
  industrial: null,
};

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
  const { usuario } = useAuth();
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
    estadoOperativo: 'operativo',
    temperaturaMin: 20,
    temperaturaMax: 80,
    temperaturaAlerta: 85,
    temperaturaCritica: 95,
    amperajeNormal: 0,
    amperajeAlerta: null,
    amperajeCritico: null,
    presionNormal: 0,
    presionAlerta: null,
    presionCritica: null,
    voltajeMin: null,
    voltajeMax: null,
    voltajeAlerta: null,
    bateriaAlerta: null,
    bateriaCritica: null,
    tonerAlerta: null,
    tonerCritico: null,
    intervaloMedicionHoras: 120,
    intervaloLubricacionHoras: 250,
    intervaloRodamientoHoras: 500,
    proximoMantenimiento: format(new Date(), 'yyyy-MM-dd'),
    notas: '',
    esItinerante: false,
    locacionBase: '',
    locacionActual: '',
    fechaSalida: '',
    fechaRetorno: '',
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

  const openNew = () => {
    const plan = (usuario?.empresa as { plan?: string } | null)?.plan ?? 'inicial';
    const limite = LIMITES_ACTIVOS[plan] ?? 10;
    if (limite !== null && activos.length >= limite) {
      alert(`Tu plan "${plan}" permite hasta ${limite} activos.\nActualizá tu plan para agregar más.`);
      return;
    }
    setEditId(null); setForm(emptyActivo); setShowModal(true);
  };
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
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight">Activos</h1>
          <p className="text-muted text-sm mt-1">{filtered.length} activos encontrados</p>
        </div>
        <div className="grid grid-cols-[auto_1fr] sm:flex gap-2">
          <Button
            onClick={() => exportarCsv('activos', filtered.map((a) => ({
              Codigo: a.codigo, Nombre: a.nombre, Sector: getSectorNombre(a.sectorId),
              Tipo: getTipoNombre(a.tipoId), Marca: a.marca ?? '', Modelo: a.modelo ?? '',
              Estado: a.estado, 'Estado Operativo': a.estadoOperativo,
              'Fecha Ingreso': a.fechaIngreso, 'Horas Actuales': a.horasActuales,
              Responsable: getTecnicoNombre(a.responsableId ?? null),
              Ubicacion: a.ubicacion ?? '', Notas: a.notas ?? '',
            })))}
            variant="secondary"
            iconLeft={<Download size={15} />}
            title="Exportar lista a CSV"
          >
            <span className="hidden sm:inline">CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button
            onClick={openNew}
            iconLeft={<Plus size={16} />}
            block
          >
            <span className="hidden sm:inline">Nuevo Activo</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_170px_170px_auto] gap-3 items-end">
        <Input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={15} />}
        />
        <Select
          value={sectorFiltro}
          onChange={(e) => setSectorFiltro(e.target.value)}
        >
          <option value="Todos">Todos los sectores</option>
          {sectoresActivos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Select>
        <Select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          {ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="estado">Ordenar: Estado</option>
          <option value="nombre">Ordenar: Nombre</option>
          <option value="sector">Ordenar: Sector</option>
        </Select>
        <div className="flex h-11 rounded-md border border-line bg-surface overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`press px-3 flex-1 sm:flex-none ${view === 'grid' ? 'bg-brand-600 text-white' : 'text-faint hover:text-content hover:bg-subtle'}`}
            aria-label="Vista de tarjetas"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('table')}
            className={`press px-3 flex-1 sm:flex-none ${view === 'table' ? 'bg-brand-600 text-white' : 'text-faint hover:text-content hover:bg-subtle'}`}
            aria-label="Vista de tabla"
          >
            <List size={16} />
          </button>
        </div>
      </Card>

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
                onEdit={() => openEdit(activo)}
              />
            );
          })}
        </div>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-faint">
                {['Código', 'Nombre', 'Tipo', 'Sector', 'Responsable', 'Estado', 'Próx. Mant.'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/activos/${a.id}`)}
                  className="hover:bg-subtle cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-content whitespace-nowrap">{a.codigo}</td>
                  <td className="px-4 py-3 font-semibold text-content">{a.nombre}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{getTipoNombre(a.tipoId)}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{getSectorNombre(a.sectorId)}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{getTecnicoNombre(a.responsableId)}</td>
                  <td className="px-4 py-3"><StatusBadge estado={a.estado} size="sm" /></td>
                  <td className="px-4 py-3 text-muted font-mono text-xs whitespace-nowrap">{a.proximoMantenimiento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-line shadow-lift w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 z-10 bg-surface">
              <h2 className="font-display text-lg font-bold text-content">{editId ? 'Editar activo' : 'Nuevo activo'}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="press grid place-items-center w-9 h-9 rounded-full text-faint hover:text-content hover:bg-subtle transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Código', key: 'codigo', required: true },
                { label: 'Nombre', key: 'nombre', required: true },
                { label: 'Marca', key: 'marca' },
                { label: 'Modelo', key: 'modelo' },
                { label: 'Ubicación', key: 'ubicacion' },
              ].map(({ label, key, required }) => (
                <Input
                  key={key}
                  label={label}
                  type="text"
                  required={required}
                  value={(form as Record<string, unknown>)[key] as string}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              ))}
              <div>
                <Select
                  label="Responsable"
                  value={form.responsableId}
                  onChange={(e) => setForm((prev) => ({ ...prev, responsableId: e.target.value }))}
                >
                  <option value="">Sin asignar</option>
                  {tecnicosActivos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </Select>
              </div>
              <div>
                <Select
                  label="Tipo"
                  value={form.tipoId}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipoId: e.target.value }))}
                >
                  {tiposActivos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </Select>
              </div>
              <div>
                <Select
                  label="Sector"
                  value={form.sectorId}
                  onChange={(e) => setForm((prev) => ({ ...prev, sectorId: e.target.value }))}
                >
                  {sectoresActivos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </Select>
              </div>
              <div>
                <Select
                  label="Estado inicial"
                  value={form.estado}
                  onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value as EstadoActivo }))}
                >
                  {['normal', 'alerta', 'critico', 'mantenimiento'].map((s) => <option key={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <Select
                  label="Estado operativo"
                  value={form.estadoOperativo ?? 'operativo'}
                  onChange={(e) => setForm((prev) => ({ ...prev, estadoOperativo: e.target.value as EstadoOperativo }))}
                >
                  {ESTADOS_OPERATIVOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
              <Input
                label="Fecha ingreso"
                type="date"
                value={form.fechaIngreso}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaIngreso: e.target.value }))}
              />
              <Input
                label="Próximo mantenimiento"
                type="date"
                value={form.proximoMantenimiento}
                onChange={(e) => setForm((prev) => ({ ...prev, proximoMantenimiento: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Notas"
                  value={form.notas}
                  onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Activo itinerante */}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer border border-line rounded-md px-4 py-3 hover:border-line-strong transition-colors bg-subtle">
                  <input
                    type="checkbox"
                    checked={!!form.esItinerante}
                    onChange={(e) => setForm((prev) => ({ ...prev, esItinerante: e.target.checked }))}
                    className="w-4 h-4 accent-brand-600"
                  />
                  <span className="text-sm font-semibold text-content">
                    Activo itinerante (se traslada entre ubicaciones)
                  </span>
                </label>
              </div>
              {form.esItinerante && (
                <>
                  <Input label="Locación base" type="text" value={form.locacionBase ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, locacionBase: e.target.value }))} />
                  <Input label="Locación actual" type="text" value={form.locacionActual ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, locacionActual: e.target.value }))} />
                  <Input label="Fecha de salida" type="date" value={form.fechaSalida ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, fechaSalida: e.target.value }))} />
                  <Input label="Fecha de retorno estimada" type="date" value={form.fechaRetorno ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, fechaRetorno: e.target.value }))} />
                </>
              )}

              {/* Parámetros de medición */}
              <ParametrosMedicion form={form} setForm={setForm} />

              <div className="sm:col-span-2 grid grid-cols-2 sm:flex sm:justify-end gap-3 mt-2">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editId ? 'Guardar Cambios' : 'Crear Activo'}
                </Button>
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
    <label className="block text-xs font-semibold text-muted tracking-wide mb-1">
      {label}{unidad && <span className="text-faint font-normal"> ({unidad})</span>}
    </label>
    <input
      type="number"
      value={(form[campo] as number) ?? ''}
      onChange={(e) => setForm((prev) => ({ ...prev, [campo]: e.target.value === '' ? null : Number(e.target.value) }))}
      className="w-full border border-line rounded-md bg-surface px-3 h-10 text-sm text-content outline-none focus:border-brand-600 focus:shadow-ring"
    />
  </div>
);

const ParametrosMedicion: React.FC<{
  form: FormActivo;
  setForm: React.Dispatch<React.SetStateAction<FormActivo>>;
}> = ({ form, setForm }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="sm:col-span-2 border border-line rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-subtle hover:bg-surface-2 transition-colors"
      >
        <span className="text-sm font-semibold text-content">
          Parámetros de medición y alertas
        </span>
        {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {abierto && (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-semibold text-brand-600 mb-2">Temperatura</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CampoNum label="Mín normal" campo="temperaturaMin" form={form} setForm={setForm} unidad="°C" />
              <CampoNum label="Máx normal" campo="temperaturaMax" form={form} setForm={setForm} unidad="°C" />
              <CampoNum label="Alerta"     campo="temperaturaAlerta"   form={form} setForm={setForm} unidad="°C" />
              <CampoNum label="Crítica"    campo="temperaturaCritica"  form={form} setForm={setForm} unidad="°C" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-semibold text-brand-600 mb-2 mt-2">Amperaje</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <CampoNum label="Normal"  campo="amperajeNormal"  form={form} setForm={setForm} unidad="A" />
              <CampoNum label="Alerta"  campo="amperajeAlerta"  form={form} setForm={setForm} unidad="A" />
              <CampoNum label="Crítico" campo="amperajeCritico" form={form} setForm={setForm} unidad="A" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-semibold text-brand-600 mb-2 mt-2">Presión</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <CampoNum label="Normal"  campo="presionNormal"  form={form} setForm={setForm} unidad="bar" />
              <CampoNum label="Alerta"  campo="presionAlerta"  form={form} setForm={setForm} unidad="bar" />
              <CampoNum label="Crítica" campo="presionCritica" form={form} setForm={setForm} unidad="bar" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-semibold text-brand-600 mb-2 mt-2">Voltaje</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <CampoNum label="Mín"    campo="voltajeMin"   form={form} setForm={setForm} unidad="V" />
              <CampoNum label="Máx"    campo="voltajeMax"   form={form} setForm={setForm} unidad="V" />
              <CampoNum label="Alerta" campo="voltajeAlerta" form={form} setForm={setForm} unidad="V" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-semibold text-brand-600 mb-2 mt-2">Batería / Tóner (valores bajos = peor)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CampoNum label="Batería alerta"   campo="bateriaAlerta"  form={form} setForm={setForm} unidad="%" />
              <CampoNum label="Batería crítica"  campo="bateriaCritica" form={form} setForm={setForm} unidad="%" />
              <CampoNum label="Tóner alerta"     campo="tonerAlerta"    form={form} setForm={setForm} unidad="%" />
              <CampoNum label="Tóner crítico"    campo="tonerCritico"   form={form} setForm={setForm} unidad="%" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-semibold text-brand-600 mb-2 mt-2">Intervalos de mantenimiento</p>
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
