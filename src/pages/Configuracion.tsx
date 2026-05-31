import React, { useState } from 'react';
import { Plus, Pencil, Trash2, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { Sector, TipoActivo, Tecnico } from '../data/types';
import { cancelarMiSuscripcion } from '../data/adminApi';

type Tab = 'sectores' | 'tipos' | 'tecnicos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'sectores', label: 'Sectores' },
  { id: 'tipos', label: 'Tipos de Activo' },
  { id: 'tecnicos', label: 'Técnicos' },
];

const inputCls =
  'w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500 bg-white';
const labelCls = 'block text-xs font-black uppercase tracking-wider text-slate-600 mb-1';

export const Configuracion: React.FC = () => {
  const {
    sectores, addSector, updateSector, deleteSector,
    tipos, addTipo, updateTipo, deleteTipo,
    tecnicos, addTecnico, updateTecnico, deleteTecnico,
  } = useActivos();

  const [tab, setTab] = useState<Tab>('sectores');

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sketch text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">
          Configuración
        </h1>
        <p className="text-slate-500 text-sm mt-1">Gestioná sectores, tipos de activo y técnicos</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 min-h-[44px] font-sketch text-lg font-bold uppercase border-2 transition-all ${
              tab === t.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sectores' && (
        <SectoresSection
          sectores={sectores}
          addSector={addSector}
          updateSector={updateSector}
          deleteSector={deleteSector}
        />
      )}
      {tab === 'tipos' && (
        <TiposSection tipos={tipos} addTipo={addTipo} updateTipo={updateTipo} deleteTipo={deleteTipo} />
      )}
      {tab === 'tecnicos' && (
        <TecnicosSection
          tecnicos={tecnicos}
          addTecnico={addTecnico}
          updateTecnico={updateTecnico}
          deleteTecnico={deleteTecnico}
        />
      )}

      <SeccionSuscripcion />
    </div>
  );
};

// ─── Reusable card wrapper ─────────────────────────────────────
const Card: React.FC<{ inactivo?: boolean; children: React.ReactNode }> = ({ inactivo, children }) => (
  <div
    className={`bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 ${
      inactivo ? 'opacity-50' : ''
    }`}
  >
    {children}
  </div>
);

const AddButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-orange-500 text-white px-4 min-h-[44px] font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
  >
    <Plus size={16} />
    {label}
  </button>
);

const IconBtn: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; danger?: boolean }> = ({
  onClick, title, children, danger,
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center border-2 transition-colors ${
      danger
        ? 'border-slate-300 text-red-600 hover:border-red-600 hover:bg-red-50'
        : 'border-slate-300 text-slate-600 hover:border-slate-800'
    }`}
  >
    {children}
  </button>
);

// ─── SECTORES ──────────────────────────────────────────────────
interface SectoresProps {
  sectores: Sector[];
  addSector: (s: Sector) => void;
  updateSector: (id: string, u: Partial<Sector>) => void;
  deleteSector: (id: string) => void;
}

const SectoresSection: React.FC<SectoresProps> = ({ sectores, addSector, updateSector, deleteSector }) => {
  const [editing, setEditing] = useState<Sector | null>(null);
  const [adding, setAdding] = useState(false);

  const empty: Omit<Sector, 'id'> = { nombre: '', color: '#F97316', activo: true };
  const [form, setForm] = useState<Omit<Sector, 'id'>>(empty);

  const startAdd = () => { setForm(empty); setAdding(true); setEditing(null); };
  const startEdit = (s: Sector) => { setForm({ nombre: s.nombre, color: s.color, activo: s.activo }); setEditing(s); setAdding(false); };
  const cancel = () => { setAdding(false); setEditing(null); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateSector(editing.id, form);
    else addSector({ ...form, id: `sec-${Date.now()}` });
    cancel();
  };

  const confirmDelete = (s: Sector) => {
    if (window.confirm(`¿Eliminar el sector "${s.nombre}"? Si tiene activos asociados se marcará como inactivo.`)) {
      deleteSector(s.id);
    }
  };

  return (
    <div className="space-y-4">
      {!adding && !editing && <AddButton onClick={startAdd} label="Agregar Sector" />}

      {(adding || editing) && (
        <form onSubmit={submit} className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input required value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <input type="color" value={form.color ?? '#F97316'} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="w-full h-11 border-2 border-slate-300 bg-white" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={cancel} className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600">Cancelar</button>
            <button type="submit" className="px-4 min-h-[44px] bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">{editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectores.map((s) => (
          <Card key={s.id} inactivo={!s.activo}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 border-2 border-slate-300 flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-bold text-slate-800 truncate">{s.nombre}</span>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {s.activo ? (
                  <>
                    <IconBtn onClick={() => startEdit(s)} title="Editar"><Pencil size={15} /></IconBtn>
                    <IconBtn onClick={() => confirmDelete(s)} title="Eliminar" danger><Trash2 size={15} /></IconBtn>
                  </>
                ) : (
                  <IconBtn onClick={() => updateSector(s.id, { activo: true })} title="Reactivar"><RotateCcw size={15} /></IconBtn>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── TIPOS ─────────────────────────────────────────────────────
interface TiposProps {
  tipos: TipoActivo[];
  addTipo: (t: TipoActivo) => void;
  updateTipo: (id: string, u: Partial<TipoActivo>) => void;
  deleteTipo: (id: string) => void;
}

const MIDE_FIELDS: { key: keyof Pick<TipoActivo, 'mideTemperatura' | 'mideAmperaje' | 'midePresion' | 'mideVibracion'>; label: string }[] = [
  { key: 'mideTemperatura', label: 'Temperatura' },
  { key: 'mideAmperaje', label: 'Amperaje' },
  { key: 'midePresion', label: 'Presión' },
  { key: 'mideVibracion', label: 'Vibración' },
];

const TiposSection: React.FC<TiposProps> = ({ tipos, addTipo, updateTipo, deleteTipo }) => {
  const [editing, setEditing] = useState<TipoActivo | null>(null);
  const [adding, setAdding] = useState(false);

  const empty: Omit<TipoActivo, 'id'> = {
    nombre: '', mideTemperatura: true, mideAmperaje: false, midePresion: false, mideVibracion: false, activo: true,
  };
  const [form, setForm] = useState<Omit<TipoActivo, 'id'>>(empty);

  const startAdd = () => { setForm(empty); setAdding(true); setEditing(null); };
  const startEdit = (t: TipoActivo) => {
    setForm({ nombre: t.nombre, icono: t.icono, mideTemperatura: t.mideTemperatura, mideAmperaje: t.mideAmperaje, midePresion: t.midePresion, mideVibracion: t.mideVibracion, activo: t.activo });
    setEditing(t); setAdding(false);
  };
  const cancel = () => { setAdding(false); setEditing(null); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateTipo(editing.id, form);
    else addTipo({ ...form, id: `tip-${Date.now()}` });
    cancel();
  };

  const confirmDelete = (t: TipoActivo) => {
    if (window.confirm(`¿Eliminar el tipo "${t.nombre}"? Si tiene activos asociados se marcará como inactivo.`)) {
      deleteTipo(t.id);
    }
  };

  return (
    <div className="space-y-4">
      {!adding && !editing && <AddButton onClick={startAdd} label="Agregar Tipo" />}

      {(adding || editing) && (
        <form onSubmit={submit} className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 space-y-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input required value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>¿Qué mide?</label>
            <div className="grid grid-cols-2 gap-2">
              {MIDE_FIELDS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 border-2 border-slate-300 px-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" checked={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={cancel} className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600">Cancelar</button>
            <button type="submit" className="px-4 min-h-[44px] bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">{editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tipos.map((t) => (
          <Card key={t.id} inactivo={!t.activo}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-bold text-slate-800 truncate">{t.nombre}</span>
              <div className="flex gap-1.5 flex-shrink-0">
                {t.activo ? (
                  <>
                    <IconBtn onClick={() => startEdit(t)} title="Editar"><Pencil size={15} /></IconBtn>
                    <IconBtn onClick={() => confirmDelete(t)} title="Eliminar" danger><Trash2 size={15} /></IconBtn>
                  </>
                ) : (
                  <IconBtn onClick={() => updateTipo(t.id, { activo: true })} title="Reactivar"><RotateCcw size={15} /></IconBtn>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {MIDE_FIELDS.filter(({ key }) => t[key]).map(({ key, label }) => (
                <span key={key} className="text-xs font-semibold bg-slate-100 border border-slate-300 px-2 py-0.5 text-slate-600 flex items-center gap-1">
                  <Check size={11} /> {label}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── TECNICOS ──────────────────────────────────────────────────
interface TecnicosProps {
  tecnicos: Tecnico[];
  addTecnico: (t: Tecnico) => void;
  updateTecnico: (id: string, u: Partial<Tecnico>) => void;
  deleteTecnico: (id: string) => void;
}

const TecnicosSection: React.FC<TecnicosProps> = ({ tecnicos, addTecnico, updateTecnico, deleteTecnico }) => {
  const [editing, setEditing] = useState<Tecnico | null>(null);
  const [adding, setAdding] = useState(false);

  const empty: Omit<Tecnico, 'id'> = { nombre: '', rol: 'tecnico', email: '', telefono: '', activo: true };
  const [form, setForm] = useState<Omit<Tecnico, 'id'>>(empty);

  const startAdd = () => { setForm(empty); setAdding(true); setEditing(null); };
  const startEdit = (t: Tecnico) => {
    setForm({ nombre: t.nombre, rol: t.rol, email: t.email ?? '', telefono: t.telefono ?? '', activo: t.activo });
    setEditing(t); setAdding(false);
  };
  const cancel = () => { setAdding(false); setEditing(null); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateTecnico(editing.id, form);
    else addTecnico({ ...form, id: `tec-${Date.now()}` });
    cancel();
  };

  const confirmDelete = (t: Tecnico) => {
    if (window.confirm(`¿Eliminar al técnico "${t.nombre}"? Si tiene registros asociados se marcará como inactivo.`)) {
      deleteTecnico(t.id);
    }
  };

  return (
    <div className="space-y-4">
      {!adding && !editing && <AddButton onClick={startAdd} label="Agregar Técnico" />}

      {(adding || editing) && (
        <form onSubmit={submit} className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input required value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Rol</label>
            <select value={form.rol} onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value as Tecnico['rol'] }))} className={inputCls}>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="tecnico">Técnico</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={cancel} className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600">Cancelar</button>
            <button type="submit" className="px-4 min-h-[44px] bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">{editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tecnicos.map((t) => (
          <Card key={t.id} inactivo={!t.activo}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate">{t.nombre}</div>
                <div className="text-xs font-semibold uppercase text-orange-500 tracking-wider">{t.rol}</div>
                {t.email && <div className="text-xs text-slate-500 truncate mt-1">{t.email}</div>}
                {t.telefono && <div className="text-xs text-slate-500 truncate">{t.telefono}</div>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {t.activo ? (
                  <>
                    <IconBtn onClick={() => startEdit(t)} title="Editar"><Pencil size={15} /></IconBtn>
                    <IconBtn onClick={() => confirmDelete(t)} title="Eliminar" danger><Trash2 size={15} /></IconBtn>
                  </>
                ) : (
                  <IconBtn onClick={() => updateTecnico(t.id, { activo: true })} title="Reactivar"><RotateCcw size={15} /></IconBtn>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const SeccionSuscripcion: React.FC = () => {
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cancelada, setCancelada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancelar = async () => {
    setCargando(true);
    setError(null);
    try {
      await cancelarMiSuscripcion();
      setCancelada(true);
      setConfirmando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cancelar la suscripción.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mt-10 border-t-2 border-slate-200 pt-8">
      <h2 className="font-sketch font-black text-xl uppercase tracking-tight text-slate-800 mb-1">
        Suscripción
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Gestioná tu suscripción activa a ActivaQR.
      </p>

      {cancelada ? (
        <div className="border-2 border-emerald-400 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Tu suscripción fue cancelada. Los débitos automáticos se detendrán en el próximo ciclo.
        </div>
      ) : (
        <>
          {error && (
            <div className="border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 mb-3">
              {error}
            </div>
          )}

          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              className="flex items-center gap-2 border-2 border-red-300 text-red-600 px-4 py-2 text-sm font-bold hover:border-red-600 hover:bg-red-50 transition-colors"
            >
              <AlertTriangle size={16} />
              Cancelar mi suscripción
            </button>
          ) : (
            <div className="border-2 border-red-400 bg-red-50 p-4 space-y-3 max-w-md">
              <p className="text-sm font-black text-red-700 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle size={16} /> Confirmá la cancelación
              </p>
              <p className="text-sm text-red-600">
                Esto dará de baja tu suscripción en Mercado Pago. Los débitos automáticos se detendrán. ¿Estás seguro?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelar}
                  disabled={cargando}
                  className="px-4 py-2 bg-red-600 text-white border-2 border-red-800 font-bold text-sm disabled:opacity-50"
                >
                  {cargando ? 'Cancelando...' : 'Sí, cancelar suscripción'}
                </button>
                <button
                  onClick={() => { setConfirmando(false); setError(null); }}
                  className="px-4 py-2 border-2 border-slate-400 font-bold text-sm text-slate-600"
                >
                  No, volver
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
