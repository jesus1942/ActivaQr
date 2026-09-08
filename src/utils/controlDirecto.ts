/** Sólo la iluminación identificada permite mando directo; cargas desconocidas conservan confirmación. */
export function permiteControlDirecto(device: { tipo: string; nombre: string; variables: Array<{ clave: string; valorTexto?: string | null }> }, channel: { uso?: string; nombre: string }) {
  if (device.tipo === 'sensor_ambiente' || device.variables.some((v) => v.clave === 'operation_mode' && v.valorTexto === 'motor')) return false;
  if (channel.uso && !['carga', 'lampara', 'otro'].includes(channel.uso)) return false;
  const name = `${device.nombre} ${channel.nombre}`;
  if (/compresor|frigor|cámara|camara|bomba|motor|calef|ventilador/i.test(name)) return false;
  return channel.uso === 'lampara' || /\b(luz|luces|led|rgbw?|lámpara|lampara|iluminación|iluminacion)\b/i.test(name);
}
