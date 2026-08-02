export interface CotizacionRemota {
  compra: number | null;
  venta: number;
  fechaFuente: Date;
  fuente: string;
}

function numeroPositivo(value: unknown): number | null {
  const numero = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function fechaValida(value: unknown): Date {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new Error('El proveedor no informó la fecha de la cotización.');
  }
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) {
    throw new Error('El proveedor informó una fecha de cotización inválida.');
  }
  return fecha;
}

function validarCotizacion(cotizacion: CotizacionRemota): CotizacionRemota {
  // Defensa ante respuestas corruptas o con otra moneda/unidad.
  if (cotizacion.venta < 100 || cotizacion.venta > 100_000) {
    throw new Error('El proveedor devolvió una cotización MEP fuera de rango.');
  }
  return cotizacion;
}

export function parsearDolarApi(payload: unknown): CotizacionRemota {
  const data = payload as {
    compra?: unknown;
    venta?: unknown;
    fechaActualizacion?: unknown;
  };
  const venta = numeroPositivo(data?.venta);
  if (!venta) throw new Error('DolarApi no devolvió el valor vendedor.');
  return validarCotizacion({
    compra: numeroPositivo(data.compra),
    venta,
    fechaFuente: fechaValida(data.fechaActualizacion),
    fuente: 'DolarApi MEP',
  });
}

export function parsearArgentinaDatos(payload: unknown): CotizacionRemota {
  const registros = Array.isArray(payload) ? payload : [payload];
  const data = registros
    .filter((item) =>
      String((item as { casa?: unknown })?.casa ?? '').toLowerCase() === 'bolsa'
    )
    .sort((a, b) => {
      const fechaA = new Date(String((a as { fecha?: unknown }).fecha ?? 0)).getTime();
      const fechaB = new Date(String((b as { fecha?: unknown }).fecha ?? 0)).getTime();
      return fechaB - fechaA;
    })[0] as { compra?: unknown; venta?: unknown; fecha?: unknown } | undefined;
  const venta = numeroPositivo(data?.venta);
  if (!data || !venta) throw new Error('ArgentinaDatos no devolvió el dólar bolsa.');
  return validarCotizacion({
    compra: numeroPositivo(data.compra),
    venta,
    fechaFuente: fechaValida(data.fecha),
    fuente: 'ArgentinaDatos MEP',
  });
}
