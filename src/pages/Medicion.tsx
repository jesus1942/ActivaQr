// v1.1.0
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, CheckCircle, ArrowLeft, ClipboardList, Camera, AlertTriangle, Zap, ImagePlus, X } from 'lucide-react';
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
  if (!isNaN(t)) {
    e = peor(e, evalMax(t, activo.temperaturaAlerta, activo.temperaturaCritica, activo.temperaturaMax));
    // Temperatura por debajo del minimo tambien es anormal
    if (activo.temperaturaMin != null && t < activo.temperaturaMin) e = peor(e, 'alerta');
  }
  const a = parseFloat(form.amperaje);
  if (!isNaN(a)) {
    e = peor(e, evalMax(a, (activo as any).amperajeAlerta, (activo as any).amperajeCritico));
    if ((activo as any).amperajeNormal > 0 && a === 0) e = peor(e, 'alerta');
  }
  const p = parseFloat(form.presion);
  if (!isNaN(p)) {
    e = peor(e, evalMax(p, (activo as any).presionAlerta, (activo as any).presionCritica));
    if ((activo as any).presionNormal > 0 && p === 0) e = peor(e, 'alerta');
  }
  const v = parseFloat(form.voltaje);
  if (!isNaN(v)) {
    if (v === 0) e = peor(e, 'critico');
    if ((activo as any).voltajeMin != null && v < (activo as any).voltajeMin) e = peor(e, 'alerta');
    if ((activo as any).voltajeMax != null && v > (activo as any).voltajeMax) e = peor(e, 'alerta');
  }
  const bat = parseInt(form.porcentajeBateria);
  if (!isNaN(bat)) e = peor(e, evalMin(bat, (activo as any).bateriaAlerta, (activo as any).bateriaCritica));
  const ton = parseInt(form.nivelToner);
  if (!isNaN(ton)) e = peor(e, evalMin(ton, (activo as any).tonerAlerta, (activo as any).tonerCritico));
  // Vibracion: moderada = alerta, alta = critico
  if (form.vibracion === 'alta') e = peor(e, 'critico');
  else if (form.vibracion === 'moderada') e = peor(e, 'alerta');
  return e;
}

function calcularEstadoExtra(
  valores: Record<string, string | number | boolean>,
  parametros: ParametroCategoria[],
): NivelAlerta {
  let e: NivelAlerta = 'normal';
  for (const param of parametros) {
    const valorOriginal = valores[param.clave];
    if (valorOriginal === undefined || valorOriginal === null || valorOriginal === '') continue;
    const incluye = (lista?: string[] | null) => (
      lista?.some((item) => item.trim().toLowerCase() === String(valorOriginal).trim().toLowerCase()) ?? false
    );
    let actual: NivelAlerta = 'normal';
    if (incluye(param.valoresUrgente)) actual = 'urgente';
    else if (incluye(param.valoresCritico)) actual = 'critico';
    else if (incluye(param.valoresAlerta)) actual = 'alerta';
    else if (param.tipo === 'numerico' || param.tipo === 'porcentaje') {
      const valor = Number(valorOriginal);
      if (!Number.isFinite(valor)) continue;
      if (param.invertido) {
        if (param.umbralUrgente != null && valor <= param.umbralUrgente) actual = 'urgente';
        else if (param.umbralCritico != null && valor <= param.umbralCritico) actual = 'critico';
        else if (param.umbralAlerta != null && valor <= param.umbralAlerta) actual = 'alerta';
        else if (param.minNormal != null && valor < param.minNormal) actual = 'alerta';
      } else {
        if (param.umbralUrgente != null && valor >= param.umbralUrgente) actual = 'urgente';
        else if (param.umbralCritico != null && valor >= param.umbralCritico) actual = 'critico';
        else if (param.umbralAlerta != null && valor >= param.umbralAlerta) actual = 'alerta';
        else if (param.maxNormal != null && valor > param.maxNormal) actual = 'alerta';
        else if (param.minNormal != null && valor < param.minNormal) actual = 'alerta';
      }
    }
    e = peor(e, actual);
  }
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

  const color = nivel === 'urgente' ? 'bg-danger'
    : nivel === 'critico' ? 'bg-danger/70'
    : nivel === 'alerta' ? 'bg-warn'
    : 'bg-ok';

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
      <div className="h-2 bg-subtle rounded-none border border-line overflow-hidden">
        <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {nivel !== 'normal' && (
        <p className={`text-xs font-black uppercase tracking-wide ${
          nivel === 'urgente' ? 'text-danger' : nivel === 'critico' ? 'text-danger' : 'text-warn-strong dark:text-warn'
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
    const sinValor = value === undefined || value === null || value === '';
    const boolVal = value === true || value === 'true';
    return (
      <div className="mb-4">
        <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
          {param.nombre}
          {param.obligatorio && <span className="text-danger ml-1">*</span>}
        </label>
        <div className="flex gap-2">
          {[true, false].map((b) => (
            <button
              key={String(b)}
              type="button"
              onClick={() => onChange(b)}
              className={`flex-1 h-12 font-bold uppercase border transition-colors ${
                !sinValor && boolVal === b
                  ? 'bg-slate-900 text-white border-line'
                  : 'border-line text-muted hover:border-content bg-surface'
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
        <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
          {param.nombre}
          {param.obligatorio && <span className="text-danger ml-1">*</span>}
        </label>
        <input
          type="text"
          required={param.obligatorio}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-line px-3 h-11 text-sm outline-none focus:border-brand-600 bg-surface"
        />
      </div>
    );
  }

  if (param.tipo === 'seleccion') {
    return (
      <div className="mb-4">
        <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
          {param.nombre}
          {param.obligatorio && <span className="text-danger ml-1">*</span>}
        </label>
        <select
          required={param.obligatorio}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-line px-3 h-12 text-sm outline-none focus:border-brand-600 bg-surface capitalize"
        >
          <option value="">Seleccionar...</option>
          {(param.opciones ?? []).map((opcion) => (
            <option key={opcion} value={opcion}>{opcion}</option>
          ))}
        </select>
      </div>
    );
  }

  // numerico / porcentaje
  return (
    <div className="mb-4">
      <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
        {param.nombre}{param.unidad ? ` (${param.unidad})` : ''}
        {param.obligatorio && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        type="number"
        step={param.tipo === 'porcentaje' ? '1' : '0.1'}
        min={param.tipo === 'porcentaje' ? '0' : undefined}
        max={param.tipo === 'porcentaje' ? '100' : undefined}
        required={param.obligatorio}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-line px-4 h-14 text-xl font-mono outline-none focus:border-brand-600 text-center bg-surface"
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
  const { activos, mediciones, tecnicos, addMedicion, updateActivo, getSectorNombre, getTipo, getTecnicoNombre } = useActivos();
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

  // Find activo by id or by codigo/nombre search (parcial, insensible a mayúsculas)
  let activo = activos.find((a) => a.id === activoId);
  const terminoBusqueda = searchCodigo.toLowerCase().trim();
  const resultadosBusqueda = !activoId && terminoBusqueda
    ? activos.filter((a) =>
        a.codigo.toLowerCase().includes(terminoBusqueda) ||
        a.nombre.toLowerCase().includes(terminoBusqueda)
      )
    : [];
  if (!activo && resultadosBusqueda.length === 1) {
    activo = resultadosBusqueda[0];
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
  const mideHoras = tipoActivo?.mideHoras !== false;

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

  // Fotos adjuntas a la medición
  const [fotos, setFotos] = useState<string[]>([]); // base64 data URLs
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const agregarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? []);
    archivos.forEach((archivo) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) setFotos((prev) => [...prev, result]);
      };
      reader.readAsDataURL(archivo);
    });
    e.target.value = '';
  };
  const setParamExtra = (clave: string, val: string | number | boolean) =>
    setParametrosExtra((p) => ({ ...p, [clave]: val }));

  // Estado calculado automáticamente en tiempo real.
  const estadoAuto = useMemo(
    () => activo
      ? peor(calcularEstado(form, activo), calcularEstadoExtra(parametrosExtra, categoria?.parametros ?? []))
      : 'normal',
    [form, activo, parametrosExtra, categoria?.parametros],
  );

  // El estado manual solo se muestra si supera al automático.
  const tieneUmbrales = activo && (
    activo.temperaturaAlerta != null || activo.temperaturaCritica != null ||
    (activo as any).amperajeAlerta != null || (activo as any).presionAlerta != null ||
    (activo as any).bateriaAlerta != null || (activo as any).tonerAlerta != null ||
    (categoria?.parametros ?? []).some((p) =>
      p.umbralAlerta != null || p.umbralCritico != null || p.umbralUrgente != null ||
      p.minNormal != null || p.maxNormal != null
    )
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activo) return;
    const faltante = (categoria?.parametros ?? []).find((param) => (
      param.obligatorio
      && (parametrosExtra[param.clave] === undefined || parametrosExtra[param.clave] === '')
    ));
    if (faltante) {
      alert(`Completá el campo obligatorio "${faltante.nombre}".`);
      return;
    }
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
      estado: (() => {
        // El estado de la medicion es el peor entre el manual y el automatico.
        const autoMed: EstadoMedicion = estadoAuto === 'urgente' ? 'urgente'
          : estadoAuto === 'critico' || estadoAuto === 'alerta' ? 'revision'
          : 'normal';
        const niv: Record<string, number> = { normal: 0, revision: 1, urgente: 2 };
        return (niv[form.estado] ?? 0) >= (niv[autoMed] ?? 0) ? form.estado : autoMed;
      })(),
      observaciones: form.observaciones,
      tecnicoId: form.tecnicoId,
      ...(Object.keys(parametrosExtra).length > 0 ? { parametrosExtra } : {}),
      ...(fotos.length > 0 ? { fotos } : {}),
    };
    addMedicion(newMedicion);

    // Actualizar la etiqueta del activo segun el estado calculado.
    // Solo escalamos (nunca bajamos automaticamente: requiere revision manual).
    const nivelActivo: Record<string, number> = { normal: 0, alerta: 1, mantenimiento: 1, critico: 2 };
    const estadoActivoCalc: 'normal' | 'alerta' | 'critico' =
      estadoAuto === 'urgente' || estadoAuto === 'critico' ? 'critico'
      : estadoAuto === 'alerta' ? 'alerta'
      : 'normal';
    if ((nivelActivo[estadoActivoCalc] ?? 0) > (nivelActivo[activo.estado] ?? 0)) {
      updateActivo(activo.id, { estado: estadoActivoCalc });
    }

    setSavedMedicion(newMedicion);
    setSubmitted(true);
  };

  // Success screen
  if (submitted && savedMedicion && activo) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-6 text-center">
          <CheckCircle size={48} className="text-ok mx-auto mb-3" />
          <h2 className="font-display text-4xl font-black text-content uppercase mb-1">Medición Registrada</h2>
          <div className="font-display font-bold text-brand-600 text-2xl mb-4">{activo.codigo}</div>
          <div className="text-left bg-subtle border border-line p-4 space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-xs font-bold uppercase text-muted">Fecha</span>
              <span className="font-mono text-sm">{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
            </div>
            {mideTemperatura && <div className="flex justify-between">
              <span className="text-xs font-bold uppercase text-muted">Temperatura</span>
              <span className="font-mono font-bold text-sm">{savedMedicion.temperatura}°C</span>
            </div>}
            {categoria?.parametros.map((param) => {
              const valor = savedMedicion.parametrosExtra?.[param.clave];
              if (valor === undefined || valor === '') return null;
              return (
                <div key={param.id} className="flex justify-between gap-3">
                  <span className="text-xs font-bold uppercase text-muted">{param.nombre}</span>
                  <span className="font-mono font-bold text-sm text-right capitalize">
                    {typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor)}{param.unidad ? ` ${param.unidad}` : ''}
                  </span>
                </div>
              );
            })}
            <div className="flex justify-between">
              <span className="text-xs font-bold uppercase text-muted">Estado</span>
              <StatusBadge estado={savedMedicion.estado} size="sm" />
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-bold uppercase text-muted">Técnico</span>
              <span className="text-sm">{getTecnicoNombre(savedMedicion.tecnicoId)}</span>
            </div>
            {savedMedicion.observaciones && (
              <div>
                <span className="text-xs font-bold uppercase text-muted block">Observaciones</span>
                <span className="text-sm text-muted">{savedMedicion.observaciones}</span>
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
              className="flex-1 bg-brand-600 text-white px-4 py-3 font-display font-bold text-xl border border-line"
            >
              Nueva Medición
            </button>
            <button
              onClick={() => navigate(`/activos/${activo!.id}`)}
              className="flex-1 border border-line px-4 py-3 font-display font-bold text-xl text-content"
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
        <button onClick={() => navigate(-1)} className="border border-line p-2 hover:border-content transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-content tracking-tight">Tomar Medición</h1>
      </div>

      {/* Search by código */}
      {!activoId && (
        <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 mb-4">
          <label className="block text-xs font-black uppercase tracking-wider text-muted mb-2">Buscar por Código de Activo</label>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 border border-line px-3 h-14 flex-1">
              <Search size={18} className="text-faint flex-shrink-0" />
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
              className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 h-14 font-display font-bold uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
            >
              <Camera size={20} />
              <span className="hidden sm:inline">Escanear</span>
            </button>
          </div>
          {terminoBusqueda && resultadosBusqueda.length === 0 && (
            <p className="text-danger text-sm mt-2 font-semibold">No se encontró ningún activo con ese código o nombre.</p>
          )}
          {resultadosBusqueda.length > 1 && (
            <div className="mt-2 border border-line bg-surface divide-y divide-slate-100">
              {resultadosBusqueda.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => navigate(`/medicion/${a.id}`)}
                  className="w-full text-left px-3 py-2.5 hover:bg-brand-50 transition-colors"
                >
                  <span className="text-xs font-black text-brand-600 uppercase">{a.codigo}</span>
                  <span className="text-sm font-semibold text-content ml-2">{a.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activoId && !activo && (
        <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-6 text-center">
          <p className="font-black text-lg text-content mb-1 uppercase">Activo no encontrado</p>
          <p className="text-muted text-sm mb-4">Este equipo no pertenece a tu cuenta o todavia se esta cargando.</p>
          <a
            href={`#/ficha/${activoId}`}
            className="inline-block bg-brand-600 text-white px-5 py-3 font-display font-bold uppercase border border-line shadow-soft"
          >
            Ver ficha del equipo
          </a>
        </div>
      )}

      {activo && (
        <>
          {/* Activo info */}
          <div className="bg-slate-900 text-white border border-line shadow-soft p-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-display font-black text-3xl text-brand-400">{activo.codigo}</div>
                <div className="font-semibold text-white text-sm">{activo.nombre}</div>
                <div className="text-faint text-xs mt-0.5">{getSectorNombre(activo.sectorId)} · {activo.ubicacion}</div>
              </div>
              <StatusBadge estado={activo.estado} />
            </div>
            {lastMedicion && (
              <div className="mt-3 pt-3 border-t border-line text-xs text-faint">
                Última medición: {format(parseISO(lastMedicion.fecha), 'dd/MM/yyyy', { locale: es })}
                {mideTemperatura && <> — <span className="text-warn font-mono">{lastMedicion.temperatura}°C</span></>}
              </div>
            )}
          </div>

          {/* Banner de alerta automática */}
          {estadoAuto !== 'normal' && (
            <div className={`border px-4 py-3 flex items-center gap-3 ${
              estadoAuto === 'urgente'
                ? 'border-danger bg-danger text-white'
                : estadoAuto === 'critico'
                ? 'border-danger bg-danger/10 text-danger-strong dark:text-danger'
                : 'border-warn bg-warn/10 text-warn-strong dark:text-warn'
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
          <form onSubmit={handleSubmit} className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 space-y-5">
            {/* Temperature */}
            {mideTemperatura && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
                Temperatura (°C)
                {lastMedicion && <span className="ml-2 text-faint font-normal normal-case">Anterior: {lastMedicion.temperatura}°C</span>}
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={form.temperatura}
                onChange={(e) => setForm((p) => ({ ...p, temperatura: e.target.value }))}
                className="w-full border border-line px-4 h-14 text-2xl font-mono font-black outline-none focus:border-brand-600 text-center bg-surface"
                placeholder="0.0"
              />
              <BarraUmbral valor={form.temperatura}
                alerta={activo.temperaturaAlerta} critico={activo.temperaturaCritica} max={activo.temperaturaMax} />
            </div>
            )}

            {/* Amperaje */}
            {mideAmperaje && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
                  Amperaje (A)
                  <span className="ml-2 text-faint font-normal normal-case">Normal: {activo.amperajeNormal}A</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.amperaje}
                  onChange={(e) => setForm((p) => ({ ...p, amperaje: e.target.value }))}
                  className="w-full border border-line px-4 h-14 text-xl font-mono outline-none focus:border-brand-600 text-center bg-surface"
                  placeholder="0.0"
                />
                <BarraUmbral valor={form.amperaje}
                  alerta={(activo as any).amperajeAlerta} critico={(activo as any).amperajeCritico} />
              </div>
            )}

            {/* Presión */}
            {midePresion && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">
                  Presión (bar)
                  <span className="ml-2 text-faint font-normal normal-case">Normal: {activo.presionNormal} bar</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.presion}
                  onChange={(e) => setForm((p) => ({ ...p, presion: e.target.value }))}
                  className="w-full border border-line px-4 h-14 text-xl font-mono outline-none focus:border-brand-600 text-center bg-surface"
                  placeholder="0.0"
                />
                <BarraUmbral valor={form.presion}
                  alerta={(activo as any).presionAlerta} critico={(activo as any).presionCritica} />
              </div>
            )}

            {/* Vibración */}
            {mideVibracion && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted mb-2">Vibración</label>
              <div className="grid grid-cols-2 gap-2">
                {(['ninguna', 'leve', 'moderada', 'alta'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, vibracion: v }))}
                    className={`h-12 font-display text-lg font-bold uppercase border transition-colors ${
                      form.vibracion === v
                        ? 'bg-slate-900 text-white border-line'
                        : 'border-line text-muted hover:border-content bg-surface'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Horas marcha */}
            {mideHoras && <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Horas de Marcha</label>
              <input
                type="number"
                value={form.horasMarcha}
                onChange={(e) => setForm((p) => ({ ...p, horasMarcha: e.target.value }))}
                className="w-full border border-line px-4 h-14 text-xl font-mono outline-none focus:border-brand-600 text-center bg-surface"
                placeholder={String(activo.horasActuales)}
              />
            </div>}

            {/* Voltaje */}
            {mideVoltaje && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Voltaje (V)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.voltaje}
                  onChange={(e) => setForm((p) => ({ ...p, voltaje: e.target.value }))}
                  className="w-full border border-line px-4 h-14 text-xl font-mono outline-none focus:border-brand-600 text-center bg-surface"
                  placeholder="0.0"
                />
              </div>
            )}

            {/* Batería */}
            {mideBateria && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Batería (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.porcentajeBateria}
                  onChange={(e) => setForm((p) => ({ ...p, porcentajeBateria: e.target.value }))}
                  className="w-full border border-line px-4 h-14 text-xl font-mono outline-none focus:border-brand-600 text-center bg-surface"
                  placeholder="0"
                />
                <BarraUmbral valor={form.porcentajeBateria}
                  alerta={(activo as any).bateriaAlerta} critico={(activo as any).bateriaCritica} invertido />
              </div>
            )}

            {/* Nivel de tóner */}
            {mideToner && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Nivel de tóner (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.nivelToner}
                  onChange={(e) => setForm((p) => ({ ...p, nivelToner: e.target.value }))}
                  className="w-full border border-line px-4 h-14 text-xl font-mono outline-none focus:border-brand-600 text-center bg-surface"
                  placeholder="0"
                />
                <BarraUmbral valor={form.nivelToner}
                  alerta={(activo as any).tonerAlerta} critico={(activo as any).tonerCritico} invertido />
              </div>
            )}

            {/* Contador */}
            {mideContador && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Contador (páginas/ciclos)</label>
                <input
                  type="number"
                  value={form.contador}
                  onChange={(e) => setForm((p) => ({ ...p, contador: e.target.value }))}
                  className="w-full border border-line px-4 h-14 text-xl font-mono outline-none focus:border-brand-600 text-center bg-surface"
                  placeholder="0"
                />
              </div>
            )}

            {/* Parámetros dinámicos de la categoría */}
            {categoria && categoria.parametros.length > 0 && (
              <div className="space-y-4">
                <div className="border-t border-dashed border-line pt-3">
                  <p className="text-xs font-black uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                    <ClipboardList size={13} /> {categoria.nombre}
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
              <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Estado Visual</label>
              {tieneUmbrales && estadoAuto !== 'normal' && (
                <p className="text-xs text-muted mb-2">
                  El sistema calculó <strong className={estadoAuto === 'urgente' ? 'text-danger' : estadoAuto === 'critico' ? 'text-danger' : 'text-warn-strong dark:text-warn'}>
                    {estadoAuto.toUpperCase()}
                  </strong> automáticamente. Podés confirmarlo o escalarlo manualmente.
                </p>
              )}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'normal' }))}
                  className={`w-full h-16 font-display font-black uppercase text-2xl border transition-all ${
                    form.estado === 'normal'
                      ? 'bg-ok text-white border-emerald-700 shadow-soft'
                      : 'bg-ok/10 text-ok-strong dark:text-ok border-ok'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'revision' }))}
                  className={`w-full h-16 font-display font-black uppercase text-2xl border transition-all ${
                    form.estado === 'revision'
                      ? 'bg-brand-600 text-white border-brand-700 shadow-soft'
                      : 'bg-brand-50 text-brand-700 border-brand-200'
                  }`}
                >
                  Revisión
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'urgente' }))}
                  className={`w-full h-16 font-display font-black uppercase text-2xl border transition-all ${
                    form.estado === 'urgente'
                      ? 'bg-danger text-white border-danger shadow-soft'
                      : 'bg-danger/10 text-danger-strong dark:text-danger border-danger'
                  }`}
                >
                  Urgente
                </button>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                rows={3}
                className="w-full border border-line px-3 py-3 text-base outline-none focus:border-brand-600 bg-surface"
                placeholder="Notas adicionales sobre el estado del equipo..."
              />
            </div>

            {/* Fotos */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted mb-2">Fotos del estado</label>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={agregarFoto}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fotoInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-line h-14 text-muted font-bold uppercase text-sm hover:border-brand-600 hover:text-brand-600 transition-colors bg-surface"
              >
                <ImagePlus size={20} /> Agregar foto
              </button>
              {fotos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {fotos.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt={`foto-${i}`} className="w-20 h-20 object-cover border border-line" />
                      <button
                        type="button"
                        onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-danger text-white rounded-full p-0.5 border border-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Técnico */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Técnico Responsable</label>
              <select
                required
                value={form.tecnicoId}
                onChange={(e) => setForm((p) => ({ ...p, tecnicoId: e.target.value }))}
                className="w-full border border-line px-3 h-14 text-xl outline-none focus:border-brand-600 bg-surface"
              >
                <option value="">Seleccionar técnico...</option>
                {tecnicosActivos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {/* Submit sticky en mobile */}
            <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto p-4 md:p-0 bg-canvas md:bg-transparent border border-line md:border-0 z-30">
              <button
                type="submit"
                className="w-full bg-brand-600 text-white px-4 h-16 font-display font-black text-2xl uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-soft transition-all"
              >
                Registrar Medición
              </button>
            </div>
          </form>
        </>
      )}

      {!activo && !activoId && (
        <div className="mt-6 space-y-4">
          <div className="bg-slate-900 border border-line shadow-soft p-6 text-white">
            <p className="text-xs font-black uppercase tracking-widest text-brand-400 mb-2">Como registrar</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="bg-brand-600 text-white font-black text-sm w-7 h-7 flex items-center justify-center border border-white flex-shrink-0">1</span>
                <div>
                  <p className="font-black text-sm uppercase tracking-wide">Escanear QR</p>
                  <p className="text-faint text-xs mt-0.5">Toca el boton de camara y apunta al codigo QR del equipo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-brand-600 text-white font-black text-sm w-7 h-7 flex items-center justify-center border border-white flex-shrink-0">2</span>
                <div>
                  <p className="font-black text-sm uppercase tracking-wide">O buscar por codigo</p>
                  <p className="text-faint text-xs mt-0.5">Escribe el codigo del activo, ej: HOR-MOT-001</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-brand-600 text-white font-black text-sm w-7 h-7 flex items-center justify-center border border-white flex-shrink-0">3</span>
                <div>
                  <p className="font-black text-sm uppercase tracking-wide">Cargar medicion</p>
                  <p className="text-faint text-xs mt-0.5">Completa los valores y confirma. El sistema evalua alertas automaticamente</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setEscaneando(true)}
            className="w-full flex items-center justify-center gap-3 bg-brand-600 text-white h-16 font-display font-black text-xl uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-soft transition-all"
          >
            <Camera size={24} />
            Escanear QR
          </button>
        </div>
      )}
    </div>
  );
};
