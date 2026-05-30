import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { Activo } from '../data/types';
import { format } from 'date-fns';

interface PreviewRow {
  codigo: string;
  nombre: string;
  tipo: string;
  sector: string;
  marca: string;
  modelo: string;
  responsable: string;
  ubicacion: string;
}

export const ImportarDatos: React.FC = () => {
  const { addActivo } = useActivos();
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    setError('');
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setError('El archivo debe tener al menos una fila de encabezado y una fila de datos.');
      return;
    }
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const required = ['codigo', 'nombre', 'tipo', 'sector'];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      setError(`Columnas requeridas faltantes: ${missing.join(', ')}`);
      return;
    }
    const rows: PreviewRow[] = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return {
        codigo: row.codigo,
        nombre: row.nombre,
        tipo: row.tipo,
        sector: row.sector,
        marca: row.marca || '',
        modelo: row.modelo || '',
        responsable: row.responsable || '',
        ubicacion: row.ubicacion || '',
      };
    });
    setPreview(rows);
    setImported(false);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleImport = () => {
    preview.forEach((row) => {
      addActivo({
        id: `act-import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        codigo: row.codigo,
        nombre: row.nombre,
        tipo: (row.tipo as Activo['tipo']) || 'otro',
        sector: row.sector,
        marca: row.marca,
        modelo: row.modelo,
        responsable: row.responsable,
        ubicacion: row.ubicacion,
        fechaIngreso: format(new Date(), 'yyyy-MM-dd'),
        horasActuales: 0,
        estado: 'normal',
        temperaturaMin: 20,
        temperaturaMax: 80,
        temperaturaAlerta: 85,
        temperaturaCritica: 95,
        amperajeNormal: 0,
        presionNormal: 0,
        intervaloMedicionHoras: 120,
        intervaloLubricacionHoras: 250,
        intervaloRodamientoHoras: 500,
        proximoMantenimiento: format(new Date(Date.now() + 30 * 24 * 3600 * 1000), 'yyyy-MM-dd'),
        notas: '',
      });
    });
    setImported(true);
    setPreview([]);
  };

  const csvExample = `codigo,nombre,tipo,sector,marca,modelo,responsable,ubicacion
MOT-XXX-001,Motor de Ejemplo,motor,Planta,WEG,W22 5CV,Juan García,Sector B
COM-XXX-001,Compresor Ejemplo,compresor,Taller,Schulz,CSL 10,Pedro López,Taller Norte`;

  return (
    <div>
      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Importar Datos</h1>
      <p className="text-slate-500 text-sm mb-6">Importa activos desde un archivo CSV</p>

      {imported && (
        <div className="bg-emerald-50 border-2 border-emerald-500 p-4 mb-6 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600" />
          <span className="font-bold text-emerald-800">Importación completada exitosamente</span>
        </div>
      )}

      {/* Drop Zone */}
      <div
        className={`border-4 border-dashed p-12 text-center mb-6 transition-colors cursor-pointer ${
          dragging ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-white hover:border-orange-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={40} className="mx-auto mb-3 text-slate-400" />
        <p className="text-lg font-bold text-slate-700">Arrastra tu archivo CSV aquí</p>
        <p className="text-sm text-slate-400 mt-1">o haz clic para seleccionar</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-500 p-4 mb-6 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-600" />
          <span className="font-semibold text-red-700">{error}</span>
        </div>
      )}

      {/* CSV Format instructions */}
      <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-slate-600" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Formato del Archivo CSV</h2>
        </div>
        <p className="text-sm text-slate-600 mb-3">El archivo debe tener las siguientes columnas (separadas por comas):</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { col: 'codigo', req: true },
            { col: 'nombre', req: true },
            { col: 'tipo', req: true },
            { col: 'sector', req: true },
            { col: 'marca', req: false },
            { col: 'modelo', req: false },
            { col: 'responsable', req: false },
            { col: 'ubicacion', req: false },
          ].map(({ col, req }) => (
            <div key={col} className={`text-xs font-mono px-2 py-1 border-2 ${req ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              {col} {req && <span className="text-red-500">*</span>}
            </div>
          ))}
        </div>
        <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-3 overflow-x-auto">
          <pre>{csvExample}</pre>
        </div>
        <p className="text-xs text-slate-500 mt-2">Tipos válidos: motor, compresor, bomba, camara_frio, tablero, rodamiento, generador, otro</p>
      </div>

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
              Vista Previa ({preview.length} registros)
            </h2>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <Upload size={15} />
              Importar {preview.length} Activos
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {['Código', 'Nombre', 'Tipo', 'Sector', 'Marca', 'Responsable'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-black uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-3 py-1.5 font-mono font-bold">{row.codigo}</td>
                    <td className="px-3 py-1.5">{row.nombre}</td>
                    <td className="px-3 py-1.5 capitalize">{row.tipo}</td>
                    <td className="px-3 py-1.5">{row.sector}</td>
                    <td className="px-3 py-1.5">{row.marca}</td>
                    <td className="px-3 py-1.5">{row.responsable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
