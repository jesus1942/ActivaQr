/** Construye sólo órdenes de iluminación conocidas, con los rangos RGBW v2. */
export function comandosLuzTuya(payload: Record<string, unknown>): Array<{ code: string; value: boolean | number | string }> {
  const integer = (key: string, min: number, max: number) => {
    const value = payload[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw Object.assign(new Error(`Valor inválido: ${key}.`), { status: 400 });
    return value;
  };
  if (payload.accion === 'encendido' && typeof payload.encendido === 'boolean') return [{ code: 'switch_led', value: payload.encendido }];
  if (payload.accion === 'color') return [
    { code: 'work_mode', value: 'colour' },
    { code: 'colour_data_v2', value: JSON.stringify({ h: integer('h', 0, 360), s: integer('s', 0, 1000), v: integer('v', 0, 1000) }) },
  ];
  if (payload.accion === 'blanco') return [
    { code: 'work_mode', value: 'white' },
    { code: 'bright_value_v2', value: integer('brillo', 10, 1000) },
    { code: 'temp_value_v2', value: integer('temperatura', 0, 1000) },
  ];
  if (payload.accion === 'temporizador') return [{ code: 'countdown_1', value: integer('segundos', 0, 86400) }];
  if (payload.accion === 'musica') return [{ code: 'work_mode', value: 'music' }];
  throw Object.assign(new Error('Acción de iluminación no permitida.'), { status: 400 });
}
