import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Copy, Mail } from 'lucide-react';

interface TenantCotizable {
  id: string;
  nombre: string;
  plan: string;
  _count: { activos: number };
}

interface DatosCotizador {
  empresaId: string;
  cliente: string;
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
}

const STORAGE_KEY = 'activaqr_cotizador_gestionado_v1';

const INICIAL: DatosCotizador = {
  empresaId: '',
  cliente: '',
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
};

function cargarInicial(): DatosCotizador {
  if (typeof window === 'undefined') return INICIAL;
  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { ...INICIAL, ...guardado, empresaId: '', cliente: '' };
  } catch {
    return INICIAL;
  }
}

const moneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export const CotizadorPlanGestionado: React.FC<{ empresas: TenantCotizable[] }> = ({
  empresas,
}) => {
  const [datos, setDatos] = useState<DatosCotizador>(cargarInicial);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const preferencias = { ...datos, empresaId: '', cliente: '' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferencias));
  }, [datos]);

  const totales = useMemo(() => {
    const trabajo = datos.horasVisita * datos.valorHora;
    const mediciones = datos.activos * datos.valorActivo;
    const traslado = datos.kilometrosVisita * datos.valorKilometro;
    const porVisita = trabajo + mediciones + traslado + datos.viaticosVisita;
    const subtotalMensual = porVisita * datos.visitasMes + datos.extrasMensuales;
    const descuento = subtotalMensual * Math.min(Math.max(datos.descuento, 0), 100) / 100;
    return {
      trabajo,
      mediciones,
      traslado,
      porVisita,
      subtotalMensual,
      descuento,
      mensual: Math.max(0, Math.round(subtotalMensual - descuento)),
    };
  }, [datos]);

  const textoCotizacion = useMemo(() => [
    `COTIZACIÓN PLAN GESTIONADO — ACTIVAQR`,
    datos.cliente ? `Cliente: ${datos.cliente}` : 'Cliente: a definir',
    `Plataforma: Plan ${datos.planSoftware.toUpperCase()} (suscripción de software por separado)`,
    `Equipos relevados: ${datos.activos}`,
    `Frecuencia: ${datos.visitasMes} visita(s) por mes`,
    `Duración estimada: ${datos.horasVisita} hora(s) por visita`,
    `Servicio por visita: ${moneda.format(totales.porVisita)}`,
    `Abono mensual del servicio: ${moneda.format(totales.mensual)}`,
    '',
    'Incluye toma de mediciones en campo, carga en ActivaQR, control de alertas e informe PDF.',
    'La suscripción de software se factura aparte según el plan elegido. Cotización sujeta a relevamiento final, distancia y condiciones de acceso.',
  ].join('\n'), [datos, totales]);

  const setNumero = (campo: keyof DatosCotizador, value: string) => {
    setDatos((actual) => ({ ...actual, [campo]: Math.max(0, Number(value) || 0) }));
  };

  const seleccionarTenant = (empresaId: string) => {
    const empresa = empresas.find((item) => item.id === empresaId);
    setDatos((actual) => ({
      ...actual,
      empresaId,
      cliente: empresa?.nombre ?? '',
      planSoftware: empresa?.plan ?? actual.planSoftware,
      activos: empresa?._count.activos || actual.activos,
    }));
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(textoCotizacion);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
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
    <details className="border border-line bg-surface/85 shadow-soft">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-4">
        <span className="flex items-center gap-2 font-display font-black text-lg text-content">
          <Calculator size={20} className="text-brand-600" />
          Cotizador Plan Gestionado
        </span>
        <span className="text-xs font-black uppercase tracking-wider text-brand-600">
          Servicio en campo
        </span>
      </summary>

      <div className="border-t border-line p-4 space-y-5">
        <p className="text-sm text-muted">
          Calculá la toma de mediciones como un servicio separado de la suscripción ActivaQR.
          Los valores que cargues quedan guardados sólo en este dispositivo.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">
              Tenant o prospecto
            </span>
            <select
              value={datos.empresaId}
              onChange={(event) => seleccionarTenant(event.target.value)}
              className="w-full h-10 border border-line bg-surface px-3 text-sm font-semibold outline-none focus:border-brand-600"
            >
              <option value="">Prospecto nuevo</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">
              Nombre para la cotización
            </span>
            <input
              value={datos.cliente}
              onChange={(event) => setDatos((actual) => ({ ...actual, cliente: event.target.value }))}
              placeholder="Empresa o persona de contacto"
              className="w-full h-10 border border-line bg-surface px-3 text-sm font-semibold outline-none focus:border-brand-600"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">
              Plan de software
            </span>
            <select
              value={datos.planSoftware}
              onChange={(event) => setDatos((actual) => ({ ...actual, planSoftware: event.target.value }))}
              className="w-full h-10 border border-line bg-surface px-3 text-sm font-semibold outline-none focus:border-brand-600"
            >
              <option value="inicial">Inicial</option>
              <option value="empresa">Empresa</option>
              <option value="industrial">Industrial</option>
            </select>
          </label>
          {campoNumero('Equipos a medir', 'activos')}
          {campoNumero('Visitas por mes', 'visitasMes')}
          {campoNumero('Horas por visita', 'horasVisita', 'h')}
          {campoNumero('Valor por hora', 'valorHora', 'ARS')}
          {campoNumero('Valor por equipo', 'valorActivo', 'ARS')}
          {campoNumero('Km ida y vuelta', 'kilometrosVisita', 'km')}
          {campoNumero('Valor por km', 'valorKilometro', 'ARS')}
          {campoNumero('Viáticos por visita', 'viaticosVisita', 'ARS')}
          {campoNumero('Extras mensuales', 'extrasMensuales', 'ARS')}
          {campoNumero('Descuento', 'descuento', '%')}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-line bg-subtle p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">Por visita</p>
            <p className="font-display font-black text-xl text-content">{moneda.format(totales.porVisita)}</p>
          </div>
          <div className="border border-line bg-subtle p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">Subtotal mensual</p>
            <p className="font-display font-black text-xl text-content">{moneda.format(totales.subtotalMensual)}</p>
          </div>
          <div className="border border-brand-600 bg-brand-50 dark:bg-brand-600/15 p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">Abono gestionado</p>
            <p className="font-display font-black text-xl text-content">{moneda.format(totales.mensual)}</p>
          </div>
        </div>

        <div className="border border-line bg-subtle p-3">
          <pre className="whitespace-pre-wrap font-sans text-sm text-content">{textoCotizacion}</pre>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={copiar}
            className="h-11 flex items-center justify-center gap-2 bg-brand-600 text-white border border-line font-black uppercase text-xs"
          >
            <Copy size={16} /> {copiado ? 'Cotización copiada' : 'Copiar cotización'}
          </button>
          <a
            href={`mailto:?subject=${encodeURIComponent(`Cotización ActivaQR Plan Gestionado — ${datos.cliente || 'Cliente'}`)}&body=${encodeURIComponent(textoCotizacion)}`}
            className="h-11 flex items-center justify-center gap-2 bg-surface text-content border border-line font-black uppercase text-xs"
          >
            <Mail size={16} /> Preparar email
          </a>
        </div>
      </div>
    </details>
  );
};
