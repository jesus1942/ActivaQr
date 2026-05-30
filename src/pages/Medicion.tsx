import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, CheckCircle, ArrowLeft, ClipboardList } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { Medicion as MedicionType, EstadoMedicion } from '../data/types';
import { StatusBadge } from '../components/ui/StatusBadge';

export const Medicion: React.FC = () => {
  const { activoId } = useParams<{ activoId: string }>();
  const navigate = useNavigate();
  const { activos, mediciones, addMedicion } = useActivos();

  const [searchCodigo, setSearchCodigo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [savedMedicion, setSavedMedicion] = useState<MedicionType | null>(null);

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

  const [form, setForm] = useState({
    temperatura: '',
    amperaje: '',
    presion: '',
    vibracion: 'ninguna' as MedicionType['vibracion'],
    horasMarcha: '',
    estado: 'normal' as EstadoMedicion,
    observaciones: '',
    tecnico: '',
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
      tecnico: form.tecnico,
    };
    addMedicion(newMedicion);
    setSavedMedicion(newMedicion);
    setSubmitted(true);
  };

  // Success screen
  if (submitted && savedMedicion && activo) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-6 text-center">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
          <h2 className="text-2xl font-black text-slate-900 uppercase mb-1">Medición Registrada</h2>
          <div className="font-mono font-bold text-orange-500 text-lg mb-4">{activo.codigo}</div>
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
              <span className="text-sm">{savedMedicion.tecnico}</span>
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
                setForm({ temperatura: '', amperaje: '', presion: '', vibracion: 'ninguna', horasMarcha: '', estado: 'normal', observaciones: '', tecnico: '' });
              }}
              className="flex-1 bg-orange-500 text-white px-4 py-2.5 font-bold border-2 border-slate-800"
            >
              Nueva Medición
            </button>
            <button
              onClick={() => navigate(`/activos/${activo!.id}`)}
              className="flex-1 border-2 border-slate-800 px-4 py-2.5 font-bold text-slate-700"
            >
              Ver Activo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="border-2 border-slate-300 p-1.5 hover:border-slate-800 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tomar Medición</h1>
      </div>

      {/* Search by código */}
      {!activoId && (
        <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 mb-4">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">Buscar por Código de Activo</label>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 border-2 border-slate-300 px-3 py-2 flex-1">
              <Search size={15} className="text-slate-400" />
              <input
                type="text"
                placeholder="Ej: HOR-MOT-001"
                value={searchCodigo}
                onChange={(e) => setSearchCodigo(e.target.value)}
                className="flex-1 outline-none text-sm font-mono uppercase"
              />
            </div>
          </div>
          {searchCodigo && !activo && (
            <p className="text-red-500 text-xs mt-1 font-semibold">Activo no encontrado</p>
          )}
        </div>
      )}

      {activo && (
        <>
          {/* Activo info */}
          <div className="bg-slate-900 text-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-mono font-black text-xl text-orange-400">{activo.codigo}</div>
                <div className="font-semibold text-white text-sm">{activo.nombre}</div>
                <div className="text-slate-400 text-xs mt-0.5">{activo.sector} · {activo.ubicacion}</div>
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
          <form onSubmit={handleSubmit} className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 space-y-4">
            {/* Temperature */}
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
                className="w-full border-2 border-slate-300 px-4 py-3 text-2xl font-mono font-black outline-none focus:border-orange-500 text-center"
                placeholder="0.0"
              />
            </div>

            {/* Amperaje */}
            {activo.amperajeNormal > 0 && (
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
                  className="w-full border-2 border-slate-300 px-4 py-2.5 text-lg font-mono outline-none focus:border-orange-500 text-center"
                  placeholder="0.0"
                />
              </div>
            )}

            {/* Presión */}
            {activo.presionNormal > 0 && (
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
                  className="w-full border-2 border-slate-300 px-4 py-2.5 text-lg font-mono outline-none focus:border-orange-500 text-center"
                  placeholder="0.0"
                />
              </div>
            )}

            {/* Vibración */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">Vibración</label>
              <div className="grid grid-cols-4 gap-1">
                {(['ninguna', 'leve', 'moderada', 'alta'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, vibracion: v }))}
                    className={`py-2 text-xs font-bold uppercase border-2 transition-colors ${
                      form.vibracion === v
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-300 text-slate-600 hover:border-slate-500'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Horas marcha */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Horas de Marcha</label>
              <input
                type="number"
                value={form.horasMarcha}
                onChange={(e) => setForm((p) => ({ ...p, horasMarcha: e.target.value }))}
                className="w-full border-2 border-slate-300 px-4 py-2.5 text-lg font-mono outline-none focus:border-orange-500 text-center"
                placeholder={String(activo.horasActuales)}
              />
            </div>

            {/* Estado visual */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">Estado Visual</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'normal' }))}
                  className={`py-3 font-black uppercase text-sm border-2 transition-all ${
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
                  className={`py-3 font-black uppercase text-sm border-2 transition-all ${
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
                  className={`py-3 font-black uppercase text-sm border-2 transition-all ${
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
                className="w-full border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
                placeholder="Notas adicionales sobre el estado del equipo..."
              />
            </div>

            {/* Técnico */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Técnico Responsable</label>
              <input
                type="text"
                required
                value={form.tecnico}
                onChange={(e) => setForm((p) => ({ ...p, tecnico: e.target.value }))}
                className="w-full border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
                placeholder="Nombre del técnico"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 text-white px-4 py-4 font-black text-lg uppercase border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] transition-all"
            >
              Registrar Medición
            </button>
          </form>
        </>
      )}

      {!activo && !activoId && (
        <div className="text-center text-slate-400 py-12">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Escanea un código QR o busca por código</p>
        </div>
      )}
    </div>
  );
};

