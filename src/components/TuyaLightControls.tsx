import { useState } from 'react';
import { DispositivoIoT, solicitarComando } from '../data/controlIndustrialApi';

/** Panel RGBW: mantiene el ajuste local hasta que el usuario pulsa Aplicar. */
export function TuyaLightControls({ device, enabled }: { device: DispositivoIoT; enabled: boolean }) {
  const [h, setH] = useState(0);
  const [s, setS] = useState(1000);
  const [v, setV] = useState(500);
  const [white, setWhite] = useState(500);
  const [temperature, setTemperature] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const has = (key: string) => device.variables.some((item) => item.clave === key);
  const power = device.variables.find((item) => item.clave === 'switch_led')?.valorBooleano;
  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    try {
      await solicitarComando({ dispositivoId: device.id, tipo: 'luz', payload, motivo: 'Ajuste de iluminación desde ActivaQR Control.' });
      setMessage('Tuya aceptó la orden. El estado se actualizará con la próxima lectura.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo enviar la orden.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-slate-700 bg-[#0b1626] p-5 text-slate-200">
    <h3 className="text-lg font-semibold">Iluminación RGBW · {device.nombre}</h3>
    <p className="mt-2 text-xs text-slate-400">Estado informado: {power == null ? 'sin datos' : power ? 'encendida' : 'apagada'} · Modo: {device.variables.find((item) => item.clave === 'work_mode')?.valorTexto || 'sin datos'}</p>
    {!enabled && <p className="mt-2 text-amber-300">Habilitá el control remoto del dispositivo para operar.</p>}
    <fieldset disabled={!enabled || busy} className="mt-4 grid gap-4 disabled:opacity-50 sm:grid-cols-2">
      <div className="flex gap-3"><button className="rounded border p-3" onClick={() => void send({ accion: 'encendido', encendido: true })}>Encender</button><button className="rounded border p-3" onClick={() => void send({ accion: 'encendido', encendido: false })}>Apagar</button></div>
      {has('colour_data_v2') && <div className="grid gap-3">
        <label>Color · {h}°<input aria-label="Tono RGB" className="block w-full" type="range" min="0" max="360" value={h} onChange={(e) => setH(Number(e.target.value))} /></label>
        <div className="h-8 rounded" style={{ backgroundColor: `hsl(${h} ${s / 10}% 50%)` }} />
        <label>Saturación · {s / 10}%<input className="block w-full" type="range" min="0" max="1000" value={s} onChange={(e) => setS(Number(e.target.value))} /></label>
        <label>Brillo RGB · {v / 10}%<input className="block w-full" type="range" min="0" max="1000" value={v} onChange={(e) => setV(Number(e.target.value))} /></label>
        <button className="rounded border border-cyan-500 p-3" onClick={() => void send({ accion: 'color', h, s, v })}>Aplicar color</button>
      </div>}
      {has('bright_value_v2') && has('temp_value_v2') && <div className="grid gap-3">
        <label>Brillo blanco · {white / 10}%<input className="block w-full" type="range" min="10" max="1000" value={white} onChange={(e) => setWhite(Number(e.target.value))} /></label>
        <label>Blanco cálido / frío<input className="block w-full" type="range" min="0" max="1000" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} /></label>
        <button className="rounded border p-3" onClick={() => void send({ accion: 'blanco', brillo: white, temperatura: temperature })}>Aplicar blanco</button>
      </div>}
      {has('countdown_1') && <div><label>Temporizador en minutos (0 cancela)<input className="mt-2 block w-full rounded bg-slate-800 p-2" type="number" min="0" max="1440" step="1" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label><button className="mt-2 rounded border p-3" onClick={() => void send({ accion: 'temporizador', segundos: minutes * 60 })}>Aplicar temporizador</button></div>}
      {has('work_mode') && <div><button className="rounded border p-3" onClick={() => void send({ accion: 'musica' })}>Activar modo música</button><p className="mt-2 text-xs text-slate-400">Este botón selecciona el modo. La respuesta al sonido depende del micrófono o fuente musical del equipo; ActivaQR no transmite audio.</p></div>}
    </fieldset>
    <p role="status" className="mt-4 text-sm">{busy ? 'Enviando…' : message}</p>
  </section>;
}
