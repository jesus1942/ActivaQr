import React, { useEffect, useRef, useState } from 'react';
import { FileText, Upload, Trash2, ExternalLink } from 'lucide-react';
import { getDocumentos, crearDocumento, eliminarDocumento, Documento } from '../data/indicadoresApi';

const TIPOS = ['manual', 'plano', 'ficha', 'certificado', 'protocolo', 'otro'];
const MAX_BYTES = 5_000_000; // 5MB de archivo real

export const DocumentosActivo: React.FC<{ activoId: string }> = ({ activoId }) => {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [tipo, setTipo] = useState('manual');
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargar = () => getDocumentos(activoId).then(setDocs).catch(() => {});
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [activoId]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.size > MAX_BYTES) { setError('El archivo supera 5MB.'); return; }
    setSubiendo(true);
    try {
      const url: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await crearDocumento({ activoId, nombre: file.name, tipo, url });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir.');
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const borrar = async (id: string) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    await eliminarDocumento(id);
    cargar();
  };

  return (
    <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4">
      <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3">Documentación</h2>

      <div className="flex gap-2 mb-3">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="border-2 border-slate-300 px-2 h-10 text-xs font-bold outline-none"
        >
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white px-3 h-10 font-bold border-2 border-slate-800 text-xs disabled:opacity-50"
        >
          <Upload size={14} /> {subiendo ? 'Subiendo...' : 'Subir archivo'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={onFile}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" />
      </div>
      {error && <p className="text-xs font-bold text-red-600 mb-2">{error}</p>}

      {docs.length === 0 ? (
        <p className="text-sm text-slate-400">Sin documentos adjuntos</p>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 border-2 border-slate-200 p-2">
              <FileText size={16} className="text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{d.nombre}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{d.tipo}</p>
              </div>
              <a href={d.url} target="_blank" rel="noopener noreferrer" download={d.nombre}
                className="p-1.5 border-2 border-slate-300 text-slate-600 hover:border-slate-800" title="Abrir">
                <ExternalLink size={13} />
              </a>
              <button onClick={() => borrar(d.id)} className="p-1.5 border-2 border-slate-300 text-red-600 hover:border-red-600" title="Eliminar">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
