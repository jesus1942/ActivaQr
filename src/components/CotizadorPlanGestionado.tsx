import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Mail, MessageCircle, Save, Send } from 'lucide-react';
import type { EmpresaAdmin } from '../data/adminApi';
import { crearCotizacion, type Cotizacion } from '../data/cotizacionesApi';
import { useToast } from './ui/Toast';

interface DatosCotizador {
  tipoProducto: 'gestionado' | 'activa_control';
  empresaId: string;
  contactoId: string;
  concepto: string;
  planSoftware: string;
  activos: number;
  visitasMes: number;
  horasVisita: number;
  valorHora: number;
  valorActivo: number;
  kilometrosVisita: number;
  valorKilometro: number;
  viaticosVisita: number;
  extrasMensuales: number;
  descuento: number;
  vigenciaDias: number;
  notas: string;
  dispositivos: number;
  costoReferenciaDispositivo: number;
  precioInstaladoDispositivo: number;
  extrasImplementacion: number;
  abonoPorDispositivo: number;
  abonoMinimoMensual: number;
  retencionDias: number;
  incluyeAlertas: boolean;
  incluyeControlRemoto: boolean;
}

const STORAGE_KEY = 'activaqr_cotizador_gestionado_v2';

const INICIAL: DatosCotizador = {
  tipoProducto: 'gestionado',
  empresaId: '',
  contactoId: '',
  concepto: 'Plan Gestionado ActivaQR',
  planSoftware: 'empresa',
  activos: 10,
  visitasMes: 1,
  horasVisita: 4,
  valorHora: 0,
  valorActivo: 0,
  kilometrosVisita: 0,
  valorKilometro: 0,
  viaticosVisita: 0,
  extrasMensuales: 0,
  descuento: 0,
  vigenciaDias: 15,
  notas: '',
  dispositivos: 1,
  costoReferenciaDispositivo: 100_000,
  precioInstaladoDispositivo: 200_000,
  extrasImplementacion: 0,
  abonoPorDispositivo: 12_000,
  abonoMinimoMensual: 35_000,
  retencionDias: 365,
  incluyeAlertas: true,
  incluyeControlRemoto: true,
};

function cargarInicial(): DatosCotizador {
  if (typeof window === 'undefined') return INICIAL;
  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { ...INICIAL, ...guardado, empresaId: '', contactoId: '' };
  } catch {
    return INICIAL;
  }
}

const moneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export const CotizadorPlanGestionado: React.FC<{
  empresas: EmpresaAdmin[];
  empresaInicialId?: string;
  onCreada: (cotizacion: Cotizacion) => void;
}> = ({ empresas, empresaInicialId, onCreada }) => {
  const { toast } = useToast();
  const [datos, setDatos] = useState<DatosCotizador>(cargarInicial);
  const [guardando, setGuardando] = useState(false);

  const seleccionarEmpresa = (empresaId: string) => {
    const empresa = empresas.find((item) => item.id === empresaId);
    setDatos((actual) => ({
      ...actual,
      empresaId,
      contactoId: empresa?.usuarios[0]?.id ?? '',
      planSoftware: empresa?.plan ?? actual.planSoftware,
      activos: empresa?._count.activos || actual.activos,
    }));
  };

  useEffect(() => {
    if (empresaInicialId && empresas.some((empresa) => empresa.id === empresaInicialId)) {
      seleccionarEmpresa(empresaInicialId);
    }
  }, [empresaInicialId, empresas.length]);

  useEffect(() => {
    const preferencias = { ...datos, empresaId: '', contactoId: '' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferencias));
  }, [datos]);

  const empresa = empresas.find((item) => item.id === datos.empresaId);
  const contacto = empresa?.usuarios.find((item) => item.id === datos.contactoId)
    ?? empresa?.usuarios[0];

  const totales = useMemo(() => {
    if (datos.tipoProducto === 'activa_control') {
      const subtotalInicial = datos.dispositivos * datos.precioInstaladoDispositivo + datos.extrasImplementacion;
      const descuento = subtotalInicial * Math.min(Math.max(datos.descuento, 0), 100) / 100;
      return {
        porVisita: datos.precioInstaladoDispositivo,
        subtotalMensual: subtotalInicial,
        descuento,
        mensual: Math.max(0, Math.round(subtotalInicial - descuento)),
        abono: Math.max(datos.dispositivos * datos.abonoPorDispositivo, datos.abonoMinimoMensual),
      };
    }
    const trabajo = datos.horasVisita * datos.valorHora;
    const mediciones = datos.activos * datos.valorActivo;
    const traslado = datos.kilometrosVisita * datos.valorKilometro;
    const porVisita = trabajo + mediciones + traslado + datos.viaticosVisita;
    const subtotalMensual = porVisita * datos.visitasMes + datos.extrasMensuales;
    const descuento = subtotalMensual * Math.min(Math.max(datos.descuento, 0), 100) / 100;
    return {
      porVisita,
      subtotalMensual,
      descuento,
      mensual: Math.max(0, Math.round(subtotalMensual - descuento)),
      abono: 0,
    };
  }, [datos]);

  const setNumero = (campo: keyof DatosCotizador, value: string) => {
    setDatos((actual) => ({ ...actual, [campo]: Math.max(0, Number(value) || 0) }));
  };

  const guardar = async () => {
    if (!datos.empresaId) {
      toast('Elegí una empresa de tu nómina.', 'warning');
      return;
    }
    setGuardando(true);
    try {
      const cotizacion = await crearCotizacion(datos);
      onCreada(cotizacion);
      toast(`Cotización ${cotizacion.numero} guardada.`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo guardar la cotización.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const campoNumero = (
    label: string,
    campo: keyof DatosCotizador,
    sufijo?: string,
  ) => (
    <label className="block">
      <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">
        {label}
      </span>
      <div className="flex">
        <input
          type="number"
          min="0"
          step="1"
          value={String(datos[campo])}
          onChange={(event) => setNumero(campo, event.target.value)}
          className="w-full h-10 border border-line bg-surface px-3 text-sm font-semibold outline-none focus:border-brand-600"
        />
        {sufijo && (
          <span className="h-10 flex items-center border border-l-0 border-line bg-subtle px-2 text-xs font-bold text-muted">
            {sufijo}
          </span>
        )}
      </div>
    </label>
  );

  return (
    <section className="border border-line bg-surface/85 shadow-soft">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-line">
        <div>
          <h2 className="flex items-center gap-2 font-display font-black text-lg text-content">
            <Calculator size={20} className="text-brand-600" /> Nueva cotización
          </h2>
          <p className="text-sm text-muted mt-1">Elegí un cliente existente; sus datos de contacto se completan desde la nómina.</p>
        </div>
        <span className="hidden sm:block text-xs font-black uppercase tracking-wider text-brand-600">{datos.tipoProducto === 'activa_control' ? 'ActivaControl' : 'Plan Gestionado'}</span>
      </div>

      <div className="p-4 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setDatos((actual) => ({ ...actual, tipoProducto: 'gestionado', concepto: 'Plan Gestionado ActivaQR' }))} className={`min-h-12 px-3 text-xs font-black uppercase ${datos.tipoProducto === 'gestionado' ? 'bg-slate-950 text-white' : 'border border-line text-muted'}`}>Gestión de activos</button>
          <button type="button" onClick={() => setDatos((actual) => ({ ...actual, tipoProducto: 'activa_control', concepto: 'ActivaControl · monitoreo y operación inteligente', planSoftware: 'industrial' }))} className={`min-h-12 px-3 text-xs font-black uppercase ${datos.tipoProducto === 'activa_control' ? 'bg-cyan-700 text-white' : 'border border-line text-muted'}`}>ActivaControl</button>
        </div>
        {datos.tipoProducto === 'activa_control' && <div className="bg-cyan-500/10 p-4 text-sm leading-relaxed text-muted"><strong className="block text-content">Producto llave en mano</strong>El cliente recibe los dispositivos instalados, el tablero personalizado, alertas, historial y soporte. La propuesta separa inversión inicial y abono mensual.</div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">Empresa de tu nómina</span>
            <select
              value={datos.empresaId}
              onChange={(event) => seleccionarEmpresa(event.target.value)}
              className="w-full h-10 border border-line bg-surface px-3 text-sm font-semibold outline-none focus:border-brand-600"
            >
              <option value="">Seleccionar empresa</option>
              {empresas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">Contacto</span>
            <select
              value={datos.contactoId}
              onChange={(event) => setDatos((actual) => ({ ...actual, contactoId: event.target.value }))}
              disabled={!empresa?.usuarios.length}
              className="w-full h-10 border border-line bg-surface px-3 text-sm font-semibold outline-none focus:border-brand-600 disabled:opacity-50"
            >
              {!empresa?.usuarios.length && <option value="">La empresa no tiene administrador activo</option>}
              {empresa?.usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>{usuario.nombre} · {usuario.email}</option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">Concepto</span>
            <input
              value={datos.concepto}
              onChange={(event) => setDatos((actual) => ({ ...actual, concepto: event.target.value }))}
              className="w-full h-10 border border-line bg-surface px-3 text-sm font-semibold outline-none focus:border-brand-600"
            />
          </label>
          {datos.tipoProducto === 'gestionado' && <label className="block">
            <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">Plan de software</span>
            <select
              value={datos.planSoftware}
              onChange={(event) => setDatos((actual) => ({ ...actual, planSoftware: event.target.value }))}
              className="w-full h-10 border border-line bg-surface px-3 text-sm font-semibold outline-none focus:border-brand-600"
            >
              <option value="inicial">Inicial</option>
              <option value="empresa">Empresa</option>
              <option value="industrial">Industrial</option>
            </select>
          </label>}
          {campoNumero('Vigencia', 'vigenciaDias', 'días')}
          {datos.tipoProducto === 'gestionado' ? <>
            {campoNumero('Equipos a medir', 'activos')}
            {campoNumero('Visitas por mes', 'visitasMes')}
            {campoNumero('Horas por visita', 'horasVisita', 'h')}
            {campoNumero('Valor por hora', 'valorHora', 'ARS')}
            {campoNumero('Valor por equipo', 'valorActivo', 'ARS')}
            {campoNumero('Km ida y vuelta', 'kilometrosVisita', 'km')}
            {campoNumero('Valor por km', 'valorKilometro', 'ARS')}
            {campoNumero('Viáticos por visita', 'viaticosVisita', 'ARS')}
            {campoNumero('Extras mensuales', 'extrasMensuales', 'ARS')}
          </> : <>
            {campoNumero('Cantidad de dispositivos', 'dispositivos')}
            {campoNumero('Costo de referencia', 'costoReferenciaDispositivo', 'ARS/u')}
            {campoNumero('Precio instalado', 'precioInstaladoDispositivo', 'ARS/u')}
            {campoNumero('Extras de implementación', 'extrasImplementacion', 'ARS')}
            {campoNumero('Abono por dispositivo', 'abonoPorDispositivo', 'ARS/mes')}
            {campoNumero('Abono mínimo', 'abonoMinimoMensual', 'ARS/mes')}
            {campoNumero('Historial', 'retencionDias', 'días')}
            <label className="flex min-h-10 items-center gap-2 text-sm font-bold text-muted"><input type="checkbox" checked={datos.incluyeAlertas} onChange={(event) => setDatos((actual) => ({ ...actual, incluyeAlertas: event.target.checked }))} /> Alertas al celular</label>
            <label className="flex min-h-10 items-center gap-2 text-sm font-bold text-muted"><input type="checkbox" checked={datos.incluyeControlRemoto} onChange={(event) => setDatos((actual) => ({ ...actual, incluyeControlRemoto: event.target.checked }))} /> Control remoto auditado</label>
          </>}
          {campoNumero('Descuento', 'descuento', '%')}
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">Observaciones</span>
            <textarea
              value={datos.notas}
              onChange={(event) => setDatos((actual) => ({ ...actual, notas: event.target.value }))}
              rows={3}
              placeholder="Alcance, condiciones de acceso o aclaraciones particulares."
              className="w-full border border-line bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-brand-600 resize-y"
            />
          </label>
        </div>

        {empresa && (
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="border border-line bg-subtle px-2 py-1 font-semibold">Cliente: {empresa.nombre}</span>
            <span className="border border-line bg-subtle px-2 py-1 flex items-center gap-1"><Mail size={12} /> {contacto?.email ?? 'Sin email'}</span>
            <span className="border border-line bg-subtle px-2 py-1 flex items-center gap-1"><MessageCircle size={12} /> {contacto?.telefono ?? 'Sin WhatsApp'}</span>
            <span className="border border-line bg-subtle px-2 py-1 flex items-center gap-1"><Send size={12} /> {contacto?.telegramDisponible ? 'Telegram vinculado' : 'Telegram no vinculado'}</span>
          </div>
        )}

        <div className={`grid gap-3 ${datos.tipoProducto === 'activa_control' ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
          <div className="border border-line bg-subtle p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">{datos.tipoProducto === 'activa_control' ? 'Instalado por equipo' : 'Por visita'}</p>
            <p className="font-display font-black text-xl text-content">{moneda.format(totales.porVisita)}</p>
          </div>
          <div className="border border-line bg-subtle p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">Subtotal</p>
            <p className="font-display font-black text-xl text-content">{moneda.format(totales.subtotalMensual)}</p>
          </div>
          <div className="border border-line bg-subtle p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">Descuento</p>
            <p className="font-display font-black text-xl text-content">-{moneda.format(totales.descuento)}</p>
          </div>
          <div className="border border-brand-600 bg-brand-50 dark:bg-brand-600/15 p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">{datos.tipoProducto === 'activa_control' ? 'Puesta en marcha' : 'Total mensual'}</p>
            <p className="font-display font-black text-xl text-content">{moneda.format(totales.mensual)}</p>
          </div>
          {datos.tipoProducto === 'activa_control' && <div className="bg-slate-950 p-3 text-white"><p className="text-[11px] font-black uppercase tracking-wider text-cyan-300">Abono mensual</p><p className="font-display text-xl font-black">{moneda.format(totales.abono)}</p></div>}
        </div>

        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !datos.empresaId}
          className="w-full sm:w-auto min-h-11 flex items-center justify-center gap-2 bg-brand-600 text-white border border-line px-5 font-black uppercase text-xs disabled:opacity-50"
        >
          <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar y preparar envío'}
        </button>
      </div>
    </section>
  );
};
