import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, CheckCircle, ArrowLeft, ClipboardList, Camera } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { QrScanner, extraerActivoId } from '../components/QrScanner';
import { Medicion as MedicionType, EstadoMedicion } from '../data/types';
import { StatusBadge } from '../components/ui/StatusBadge';

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

  const [form, setForm] = useState({
    temperatura: '',
    amperaje: '',
    presion: '',
    vibracion: 'ninguna' as MedicionType['vibracion'],
    horasMarcha: '',
    estado: 'normal' as EstadoMedicion,
    observaciones: '',
    tecnicoId: '',
  });

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
      estado: form.estado,
      observaciones: form.observaciones,
      tecnicoId: form.tecnicoId,
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
                setForm({ temperatura: '', amperaje: '', presion: '', vibracion: 'ninguna', horasMarcha: '', estado: 'normal', observaciones: '', tecnicoId: '' });
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

            {/* Estado visual — tarjetas grandes */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">Estado Visual</label>
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
