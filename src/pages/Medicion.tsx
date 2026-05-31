// v1.0
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, CheckCircle, ArrowLeft, ClipboardList, Camera, AlertTriangle, Zap } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { QrScanner, extraerActivoId } from '../components/QrScanner';
import { Medicion as MedicionType, EstadoMedicion, Activo } from '../data/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CategoriaEquipo, ParametroCategoria, getCategoria } from '../data/categoriasApi';

// ── Lógica de alertas (espejo del backend) ────────────────────────────────────
type NivelAlerta = 'normal' | 'alerta' | 'critico' | 'urgente';
const NIVEL: Record<NivelAlerta, number> = { normal: 0, alerta: 1, critico: 2, urgente: 3 };
const peor = (a: NivelAlerta, b: NivelAlerta): NivelAlerta => NIVEL[a] >= NIVEL[b] ? a : b;

function evalMax(v: number, alerta?: number | null, critico?: number | null, max?: number | null): NivelAlerta {
  if (max != null && v > max) return 'urgente';
  if (critico != null && v >= critico) return 'critico';
  if (alerta != null && v >= alerta) return 'alerta';
  return 'normal';
}
function evalMin(v: number, alerta?: number | null, critico?: number | null): NivelAlerta {
  if (critico != null && v <= critico) return 'urgente';
  if (alerta != null && v <= alerta) return 'critico';
  return 'normal';
}

function calcularEstado(form: Record<string, string>, activo: Activo): NivelAlerta {
  let e: NivelAlerta = 'normal';
  const t = parseFloat(form.temperatura);
  if (!isNaN(t)) e = peor(e, evalMax(t, activo.temperaturaAlerta, activo.temperaturaCritica, activo.temperaturaMax));
  const a = parseFloat(form.amperaje);
  if (!isNaN(a)) e = peor(e, evalMax(a, (activo as any).amperajeAlerta, (activo as any).amperajeCritico));
  const p = parseFloat(form.presion);
  if (!isNaN(p)) e = peor(e, evalMax(p, (activo as any).presionAlerta, (activo as any).presionCritica));
  const bat = parseInt(form.porcentajeBateria);
  if (!isNaN(bat)) e = peor(e, evalMin(bat, (activo as any).bateriaAlerta, (activo as any).bateriaCritica));
  const ton = parseInt(form.nivelToner);
  if (!isNaN(ton)) e = peor(e, evalMin(ton, (activo as any).tonerAlerta, (activo as any).tonerCritico));
  return e;
}

// Barra de progreso con color según posición en el rango.
function BarraUmbral({ valor, min, alerta, critico, max, invertido = false }: {
  valor: string; min?: number | null; alerta?: number | null;
  critico?: number | null; max?: number | null; invertido?: boolean;
}) {
  const v = parseFloat(valor);
  if (isNaN(v) || (alerta == null && critico == null && max == null)) return null;

  const nivel = invertido
    ? evalMin(v, alerta, critico)
    : evalMax(v, alerta, critico, max);

  const color = nivel === 'urgente' ? 'bg-red-600'
    : nivel === 'critico' ? 'bg-red-400'
    : nivel === 'alerta' ? 'bg-amber-400'
    : 'bg-emerald-400';

  const label = nivel === 'urgente' ? 'INTERVENCIÓN URGENTE'
    : nivel === 'critico' ? 'CRÍTICO'
    : nivel === 'alerta' ? 'ALERTA'
    : 'Normal';

  const pct = (() => {
    if (invertido) {
      const top = alerta ?? 100;
      return Math.min(100, Math.max(0, (1 - v / top) * 100));
    }
    const top = max ?? critico ?? alerta ?? v;
    return Math.min(100, Math.max(5, (v / top) * 100));
  })();

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-2 bg-slate-100 rounded-none border border-slate-200 overflow-hidden">
        <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {nivel !== 'normal' && (
        <p className={`text-xs font-black uppercase tracking-wide ${
          nivel === 'urgente' ? 'text-red-600' : nivel === 'critico' ? 'text-red-500' : 'text-amber-600'
        }`}>{label}</p>
      )}
    </div>
  );
}

// ─── Componente de parámetro dinámico ────────────────────────────────────────

function ParamDinamicoInput({
  param,
  value,
  onChange,
}: {
  param: ParametroCategoria;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  const strVal = value === undefined || value === null ? '' : String(value);

  if (param.tipo === 'booleano') {
    const boolVal = value === true || value === 'true';
    return (
      <div className="mb-4">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
          {param.nombre}
        </label>
        <div className="flex gap-2">
          {[true, false].map((b) => (
            <button
              key={String(b)}
              type="button"
              onClick={() => onChange(b)}
              className={`flex-1 h-12 font-bold uppercase border-2 transition-colors ${
                boolVal === b
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-300 text-slate-600 hover:border-slate-500 bg-white'
              }`}
            >
              {b ? 'Sí' : 'No'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (param.tipo === 'texto') {
    return (
      <div className="mb-4">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
          {param.nombre}
        </label>
        <input
          type="text"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500 bg-white"
        />
      </div>
    );
  }

  // numerico / porcentaje
  return (
    <div className="mb-4">
      <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
        {param.nombre}{param.unidad ? ` (${param.unidad})` : ''}
        {param.obligatorio && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="number"
        step={param.tipo === 'porcentaje' ? '1' : '0.1'}
        min={param.tipo === 'porcentaje' ? '0' : undefined}
        max={param.tipo === 'porcentaje' ? '100' : undefined}
        required={param.obligatorio}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-slate-300 px-4 h-14 text-xl font-mono outline-none focus:border-orange-500 text-center bg-white"
        placeholder="0"
      />
      <BarraUmbral
        valor={strVal}
        min={param.minNormal}
        alerta={param.umbralAlerta}
        critico={param.umbralCritico}
        max={param.umbralUrgente}
        invertido={param.invertido}
      />
    </div>
  );
}

export const Medicion: React.FC = () => {
  const { activoId } = useParams<{ activoId: string }>();
  const navigate = useNavigate();
  const { activos, mediciones, tecnicos, addMedicion, getSectorNombre, getTipo, getTecnicoNombre } = useActivos();
  const tecnicosActivos = tecnicos.filter((t) => t.activo);

  const [searchCodigo, setSearchCodigo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [savedMedicion, setSavedMedicion] = useState<MedicionType | null>(null);
  const [escaneando, setEscaneando] = useState(false);

  const onEscaneo = (texto: string) => {
    setEscaneando(false);
    const id = extraerActivoId(texto);
    if (id && activos.some((a) => a.id === id)) {
      navigate(`/medicion/${id}`);
    } else {
      alert('El QR no corresponde a un activo de esta cuenta.');
    }
  };

  // Find activo by id or by codigo search
  let activo = activos.find((a) => a.id === activoId);
  if (!activo && searchCodigo) {
    activo = activos.find((a) =>
      a.codigo.toLowerCase() === searchCodigo.toLowerCase()
    );
  }

  const lastMedicion = activo
    ? mediciones
        .filter((m) => m.activoId === activo!.id)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
    : undefined;

  const tipoActivo = activo ? getTipo(activo.tipoId) : undefined;
  // Por defecto mostramos todo si no encontramos el tipo (compat).
  const mideTemperatura = tipoActivo ? tipoActivo.mideTemperatura : true;
  const mideAmperaje = tipoActivo ? tipoActivo.mideAmperaje : activo ? activo.amperajeNormal > 0 : true;
  const midePresion = tipoActivo ? tipoActivo.midePresion : activo ? activo.presionNormal > 0 : true;
  const mideVibracion = tipoActivo ? tipoActivo.mideVibracion : true;
  const mideVoltaje = tipoActivo?.mideVoltaje ?? false;
  const mideBateria = tipoActivo?.mideBateria ?? false;
  const mideToner = tipoActivo?.mideToner ?? false;
  const mideContador = tipoActivo?.mideContador ?? false;

  // Categoría dinámica
  const [categoria, setCategoria] = useState<CategoriaEquipo | null>(null);
  useEffect(() => {
    const catId = tipoActivo?.categoriaId;
    if (!catId) { setCategoria(null); return; }
    getCategoria(catId).then(setCategoria).catch(() => setCategoria(null));
  }, [tipoActivo?.categoriaId]);

  const [form, setForm] = useState({
    temperatura: '',
    amperaje: '',
    presion: '',
    vibracion: 'ninguna' as MedicionType['vibracion'],
    horasMarcha: '',
    voltaje: '',
    porcentajeBateria: '',
    nivelToner: '',
    contador: '',
    estado: 'normal' as EstadoMedicion,
    observaciones: '',
    tecnicoId: '',
  });

  // Dynamic extra params from category
  const [parametrosExtra, setParametrosExtra] = useState<Record<string, string | number | boolean>>({});
  const setParamExtra = (clave: string, val: string | number | boolean) =>
    setParametrosExtra((p) => ({ ...p, [clave]: val }));

  // Estado calculado automáticamente en tiempo real.
  const estadoAuto = useMemo(
    () => activo ? calcularEstado(form, activo) : 'normal',
    [form, activo],
  );

  // El estado manual solo se muestra si supera al automático.
  const tieneUmbrales = activo && (
    activo.temperaturaAlerta != null || activo.temperaturaCritica != null ||
    (activo as any).amperajeAlerta != null || (activo as any).presionAlerta != null ||
    (activo as any).bateriaAlerta != null || (activo as any).tonerAlerta != null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activo) return;
    const newMedicion: MedicionType = {
      id: `med-${Date.now()}`,
      activoId: activo.id,
      fecha: format(new Date(), 'yyyy-MM-dd'),
      temperatura: parseFloat(form.temperatura) || 0,
      amperaje: parseFloat(form.amperaje) || 0,
      presion: parseFloat(form.presion) || 0,
      vibracion: form.vibracion,
      horasMarcha: parseInt(form.horasMarcha) || 0,
      ...(mideVoltaje && form.voltaje !== '' ? { voltaje: parseFloat(form.voltaje) } : {}),
      ...(mideBateria && form.porcentajeBateria !== '' ? { porcentajeBateria: parseInt(form.porcentajeBateria) } : {}),
      ...(mideToner && form.nivelToner !== '' ? { nivelToner: parseInt(form.nivelToner) } : {}),
      ...(mideContador && form.contador !== '' ? { contador: parseInt(form.contador) } : {}),
      estado: form.estado,
      observaciones: form.observaciones,
      tecnicoId: form.tecnicoId,
      ...(Object.keys(parametrosExtra).length > 0 ? { parametrosExtra } : {}),
    };
    addMedicion(newMedicion);
    setSavedMedicion(newMedicion);
    setSubmitted(true);
  };

  // Success screen
  if (submitted && savedMedicion && activo) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-[#FFFEF7] border-2 border-slate-700 shadow-[4px_4px_0px_0px_#1e293b] p-6 text-center">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
          <h2 className="font-sketch text-4xl font-black text-slate-900 uppercase mb-1">Medición Registrada</h2>
          <div className="font-sketch font-bold text-orange-500 text-2xl mb-4">{activo.codigo}</div>
          <div className="text-left bg-slate-50 border-2 border-slate-200 p-4 space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Fecha</span>
              <span className="font-mono text-sm">{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Temperatura</span>
              <span className="font-mono font-bold text-sm">{savedMedicion.temperatura}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Estado</span>
              <StatusBadge estado={savedMedicion.estado} size="sm" />
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Técnico</span>
              <span className="text-sm">{getTecnicoNombre(savedMedicion.tecnicoId)}</span>
            </div>
            {savedMedicion.observaciones && (
              <div>
                <span className="text-xs font-bold uppercase text-slate-500 block">Observaciones</span>
                <span className="text-sm text-slate-600">{savedMedicion.observaciones}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ temperatura: '', amperaje: '', presion: '', vibracion: 'ninguna', horasMarcha: '', voltaje: '', porcentajeBateria: '', nivelToner: '', contador: '', estado: 'normal', observaciones: '', tecnicoId: '' });
              setParametrosExtra({});
              }}
              className="flex-1 bg-orange-500 text-white px-4 py-3 font-sketch font-bold text-xl border-2 border-slate-800"
            >
              Nueva Medición
            </button>
            <button
              onClick={() => navigate(`/activos/${activo!.id}`)}
              className="flex-1 border-2 border-slate-800 px-4 py-3 font-sketch font-bold text-xl text-slate-700"
            >
              Ver Activo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      {escaneando && (
        <QrScanner onResult={onEscaneo} onClose={() => setEscaneando(false)} />
      )}
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="border-2 border-slate-300 p-2 hover:border-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-sketch text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">Tomar Medición</h1>
      </div>

      {/* Search by código */}
      {!activoId && (
        <div className="bg-[#FFFEF7] border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-4 mb-4">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">Buscar por Código de Activo</label>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 border-2 border-slate-300 px-3 h-14 flex-1">
              <Search size={18} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Ej: HOR-MOT-001"
                value={searchCodigo}
                onChange={(e) => setSearchCodigo(e.target.value)}
                className="flex-1 outline-none text-xl font-mono uppercase bg-transparent"
              />
            </div>
            <button
              onClick={() => setEscaneando(true)}
              title="Escanear QR"
              className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 h-14 font-sketch font-bold uppercase border-2 border-slate-900 shadow-[3px_3px_0px_0px_#f97316] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
            >
              <Camera size={20} />
              <span className="hidden sm:inline">Escanear</span>
            </button>
          </div>
          {searchCodigo && !activo && (
            <p className="text-red-500 text-sm mt-1 font-semibold">Activo no encontrado</p>
          )}
        </div>
      )}

      {activo && (
        <>
          {/* Activo info */}
          <div className="bg-slate-900 text-white border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-sketch font-black text-3xl text-orange-400">{activo.codigo}</div>
                <div className="font-semibold text-white text-sm">{activo.nombre}</div>
                <div className="text-slate-400 text-xs mt-0.5">{getSectorNombre(activo.sectorId)} · {activo.ubicacion}</div>
              </div>
              <StatusBadge estado={activo.estado} />
            </div>
            {lastMedicion && (
              <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                Última medición: {format(parseISO(lastMedicion.fecha), 'dd/MM/yyyy', { locale: es })} —
                {' '}<span className="text-orange-300 font-mono">{lastMedicion.temperatura}°C</span>
              </div>
            )}
          </div>

          {/* Banner de alerta automática */}
          {estadoAuto !== 'normal' && (
            <div className={`border-2 px-4 py-3 flex items-center gap-3 ${
              estadoAuto === 'urgente'
                ? 'border-red-600 bg-red-600 text-white'
                : estadoAuto === 'critico'
                ? 'border-red-400 bg-red-50 text-red-700'
                : 'border-amber-400 bg-amber-50 text-amber-800'
            }`}>
              {estadoAuto === 'urgente' ? <Zap size={20} /> : <AlertTriangle size={20} />}
              <div>
                <p className="font-black uppercase text-sm tracking-wide">
                  {estadoAuto === 'urgente' ? 'Intervención urgente requerida'
                    : estadoAuto === 'critico' ? 'Estado crítico detectado'
                    : 'Valor fuera del rango normal'}
                </p>
                {estadoAuto === 'urgente' && (
                  <p className="text-xs mt-0.5 font-semibold">Considerá detener el equipo y notificar al responsable.</p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-[#FFFEF7] border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b] p-4 space-y-5">
            {/* Temperature */}
            {mideTemperatura && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                Temperatura (°C)
                {lastMedicion && <span className="ml-2 text-slate-400 font-normal normal-case">Anterior: {lastMedicion.temperatura}°C</span>}
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={form.temperatura}
                onChange={(e) => setForm((p) => ({ ...p, temperatura: e.target.value }))}
                className="w-full border-2 border-slate-300 px-4 h-14 text-2xl font-mono font-black outline-none focus:border-orange-500 text-center bg-white"
                placeholder="0.0"
              />
              <BarraUmbral valor={form.temperatura}
                alerta={activo.temperaturaAlerta} critico={activo.temperaturaCritica} max={activo.temperaturaMax} />
            </div>
            )}

            {/* Amperaje */}
            {mideAmperaje && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Amperaje (A)
                  <span className="ml-2 text-slate-400 font-normal normal-case">Normal: {activo.amperajeNormal}A</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.amperaje}
                  onChange={(e) => setForm((p) => ({ ...p, amperaje: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-4 h-14 text-xl font-mono outline-none focus:border-orange-500 text-center bg-white"
                  placeholder="0.0"
                />
                <BarraUmbral valor={form.amperaje}
                  alerta={(activo as any).amperajeAlerta} critico={(activo as any).amperajeCritico} />
              </div>
            )}

            {/* Presión */}
            {midePresion && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Presión (bar)
                  <span className="ml-2 text-slate-400 font-normal normal-case">Normal: {activo.presionNormal} bar</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.presion}
                  onChange={(e) => setForm((p) => ({ ...p, presion: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-4 h-14 text-xl font-mono outline-none focus:border-orange-500 text-center bg-white"
                  placeholder="0.0"
                />
                <BarraUmbral valor={form.presion}
                  alerta={(activo as any).presionAlerta} critico={(activo as any).presionCritica} />
              </div>
            )}

            {/* Vibración */}
            {mideVibracion && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">Vibración</label>
              <div className="grid grid-cols-2 gap-2">
                {(['ninguna', 'leve', 'moderada', 'alta'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, vibracion: v }))}
                    className={`h-12 font-sketch text-lg font-bold uppercase border-2 transition-colors ${
                      form.vibracion === v
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-300 text-slate-600 hover:border-slate-500 bg-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Horas marcha */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Horas de Marcha</label>
              <input
                type="number"
                value={form.horasMarcha}
                onChange={(e) => setForm((p) => ({ ...p, horasMarcha: e.target.value }))}
                className="w-full border-2 border-slate-300 px-4 h-14 text-xl font-mono outline-none focus:border-orange-500 text-center bg-white"
                placeholder={String(activo.horasActuales)}
              />
            </div>

            {/* Voltaje */}
            {mideVoltaje && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Voltaje (V)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.voltaje}
                  onChange={(e) => setForm((p) => ({ ...p, voltaje: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-4 h-14 text-xl font-mono outline-none focus:border-orange-500 text-center bg-white"
                  placeholder="0.0"
                />
              </div>
            )}

            {/* Batería */}
            {mideBateria && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Batería (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.porcentajeBateria}
                  onChange={(e) => setForm((p) => ({ ...p, porcentajeBateria: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-4 h-14 text-xl font-mono outline-none focus:border-orange-500 text-center bg-white"
                  placeholder="0"
                />
                <BarraUmbral valor={form.porcentajeBateria}
                  alerta={(activo as any).bateriaAlerta} critico={(activo as any).bateriaCritica} invertido />
              </div>
            )}

            {/* Nivel de tóner */}
            {mideToner && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Nivel de tóner (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.nivelToner}
                  onChange={(e) => setForm((p) => ({ ...p, nivelToner: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-4 h-14 text-xl font-mono outline-none focus:border-orange-500 text-center bg-white"
                  placeholder="0"
                />
                <BarraUmbral valor={form.nivelToner}
                  alerta={(activo as any).tonerAlerta} critico={(activo as any).tonerCritico} invertido />
              </div>
            )}

            {/* Contador */}
            {mideContador && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Contador (páginas/ciclos)</label>
                <input
                  type="number"
                  value={form.contador}
                  onChange={(e) => setForm((p) => ({ ...p, contador: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-4 h-14 text-xl font-mono outline-none focus:border-orange-500 text-center bg-white"
                  placeholder="0"
                />
              </div>
            )}

            {/* Parámetros dinámicos de la categoría */}
            {categoria && categoria.parametros.length > 0 && (
              <div className="space-y-4">
                <div className="border-t-2 border-dashed border-slate-300 pt-3">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                    {categoria.icono} {categoria.nombre}
                  </p>
                  {categoria.parametros.map((param) => (
                    <ParamDinamicoInput
                      key={param.id}
                      param={param}
                      value={parametrosExtra[param.clave]}
                      onChange={(v) => setParamExtra(param.clave, v)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Estado visual — tarjetas grandes */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Estado Visual</label>
              {tieneUmbrales && estadoAuto !== 'normal' && (
                <p className="text-xs text-slate-500 mb-2">
                  El sistema calculó <strong className={estadoAuto === 'urgente' ? 'text-red-600' : estadoAuto === 'critico' ? 'text-red-500' : 'text-amber-600'}>
                    {estadoAuto.toUpperCase()}
                  </strong> automáticamente. Podés confirmarlo o escalarlo manualmente.
                </p>
              )}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'normal' }))}
                  className={`w-full h-16 font-sketch font-black uppercase text-2xl border-2 transition-all ${
                    form.estado === 'normal'
                      ? 'bg-emerald-500 text-white border-emerald-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'revision' }))}
                  className={`w-full h-16 font-sketch font-black uppercase text-2xl border-2 transition-all ${
                    form.estado === 'revision'
                      ? 'bg-orange-500 text-white border-orange-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]'
                      : 'bg-orange-50 text-orange-700 border-orange-300'
                  }`}
                >
                  Revisión
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'urgente' }))}
                  className={`w-full h-16 font-sketch font-black uppercase text-2xl border-2 transition-all ${
                    form.estado === 'urgente'
                      ? 'bg-red-600 text-white border-red-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]'
                      : 'bg-red-50 text-red-700 border-red-300'
                  }`}
                >
                  Urgente
                </button>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                rows={3}
                className="w-full border-2 border-slate-300 px-3 py-3 text-base outline-none focus:border-orange-500 bg-white"
                placeholder="Notas adicionales sobre el estado del equipo..."
              />
            </div>

            {/* Técnico */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Técnico Responsable</label>
              <select
                required
                value={form.tecnicoId}
                onChange={(e) => setForm((p) => ({ ...p, tecnicoId: e.target.value }))}
                className="w-full border-2 border-slate-300 px-3 h-14 text-xl outline-none focus:border-orange-500 bg-white"
              >
                <option value="">Seleccionar técnico...</option>
                {tecnicosActivos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {/* Submit sticky en mobile */}
            <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto p-4 md:p-0 bg-[#FAFAF7] md:bg-transparent border-t-2 border-slate-200 md:border-0 z-30">
              <button
                type="submit"
                className="w-full bg-orange-500 text-white px-4 h-16 font-sketch font-black text-2xl uppercase border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] transition-all"
              >
                Registrar Medición
              </button>
            </div>
          </form>
        </>
      )}

      {!activo && !activoId && (
        <div className="text-center text-slate-400 py-12">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-sketch text-2xl">Escaneá un código QR o buscá por código</p>
        </div>
      )}
    </div>
  );
};
