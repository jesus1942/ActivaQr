// v1.1.0
import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { format } from 'date-fns';
import { Button, Card } from '../components/ui';

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
  const { addActivo, sectores, tipos, tecnicos, addSector, addTipo, addTecnico } = useActivos();
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
    // Resolvemos (o creamos) las entidades referenciadas por nombre.
    // Acumulamos los nuevos ids localmente para no duplicar dentro del mismo import.
    const localSectores = sectores.map((s) => ({ id: s.id, nombre: s.nombre }));
    const localTipos = tipos.map((t) => ({ id: t.id, nombre: t.nombre }));
    const localTecnicos = tecnicos.map((t) => ({ id: t.id, nombre: t.nombre }));

    const norm = (s: string) => s.trim().toLowerCase();

    const resolveSector = (nombre: string): string => {
      if (!nombre) return localSectores[0]?.id ?? '';
      const found = localSectores.find((s) => norm(s.nombre) === norm(nombre));
      if (found) return found.id;
      const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      addSector({ id, nombre: nombre.trim(), color: '#94A3B8', activo: true });
      localSectores.push({ id, nombre: nombre.trim() });
      return id;
    };

    const resolveTipo = (nombre: string): string => {
      if (!nombre) return localTipos[0]?.id ?? '';
      const found = localTipos.find((t) => norm(t.nombre) === norm(nombre));
      if (found) return found.id;
      const id = `tip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      addTipo({ id, nombre: nombre.trim(), mideTemperatura: true, mideAmperaje: true, midePresion: false, mideVibracion: true, activo: true });
      localTipos.push({ id, nombre: nombre.trim() });
      return id;
    };

    const resolveTecnico = (nombre: string): string => {
      if (!nombre) return '';
      const found = localTecnicos.find((t) => norm(t.nombre) === norm(nombre));
      if (found) return found.id;
      const id = `tec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      addTecnico({ id, nombre: nombre.trim(), rol: 'tecnico', activo: true });
      localTecnicos.push({ id, nombre: nombre.trim() });
      return id;
    };

    preview.forEach((row) => {
      addActivo({
        id: `act-import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        codigo: row.codigo,
        nombre: row.nombre,
        tipoId: resolveTipo(row.tipo),
        sectorId: resolveSector(row.sector),
        marca: row.marca,
        modelo: row.modelo,
        responsableId: resolveTecnico(row.responsable),
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
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight">Importar datos</h1>
        <p className="text-muted text-sm mt-1">Importá activos desde un archivo CSV</p>
      </div>

      {imported && (
        <div className="bg-ok/10 border border-ok/40 rounded-md p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-ok-strong dark:text-ok" />
          <span className="font-semibold text-ok-strong dark:text-ok">Importación completada exitosamente</span>
        </div>
      )}

      {/* Drop Zone */}
      <Card
        as="button"
        padding="lg"
        className={`w-full text-center border-dashed transition-colors cursor-pointer ${
          dragging ? 'border-brand-600 bg-brand-50 dark:bg-brand-600/10' : 'hover:border-brand-400'
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
        <Upload size={40} className="mx-auto mb-3 text-faint" />
        <p className="text-lg font-bold text-content">Arrastrá tu archivo CSV acá</p>
        <p className="text-sm text-muted mt-1">o hacé clic para seleccionar</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
      </Card>

      {error && (
        <div className="bg-danger/10 border border-danger/40 rounded-md p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-danger" />
          <span className="font-semibold text-danger-strong dark:text-danger">{error}</span>
        </div>
      )}

      {/* CSV Format instructions */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-muted" />
          <h2 className="font-display text-base font-bold text-content">Formato del archivo CSV</h2>
        </div>
        <p className="text-sm text-muted mb-3">El archivo debe tener estas columnas separadas por comas:</p>
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
            <div key={col} className={`text-xs font-mono px-2 py-1 border-l-2 ${req ? 'border-brand-600 text-brand-700 dark:text-brand-300' : 'border-line-strong text-muted'}`}>
              {col} {req && <span className="text-danger">*</span>}
            </div>
          ))}
        </div>
        <div className="bg-content text-ok font-mono text-xs p-3 rounded-md overflow-x-auto">
          <pre>{csvExample}</pre>
        </div>
        <p className="text-xs text-muted mt-2">Los valores de <span className="font-mono">tipo</span>, <span className="font-mono">sector</span> y <span className="font-mono">responsable</span> se asocian por nombre; si no existen, se crean automáticamente.</p>
      </Card>

      {/* Preview table */}
      {preview.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold text-content px-5 pt-5">
              Vista previa ({preview.length} registros)
            </h2>
            <Button
              onClick={handleImport}
              iconLeft={<Upload size={15} />}
              className="mr-5 mt-5"
            >
              Importar {preview.length} Activos
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y border-line text-faint">
                  {['Código', 'Nombre', 'Tipo', 'Sector', 'Marca', 'Responsable'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-subtle transition-colors">
                    <td className="px-4 py-2 font-mono font-bold text-content">{row.codigo}</td>
                    <td className="px-4 py-2 text-muted">{row.nombre}</td>
                    <td className="px-4 py-2 text-muted capitalize">{row.tipo}</td>
                    <td className="px-4 py-2 text-muted">{row.sector}</td>
                    <td className="px-4 py-2 text-muted">{row.marca}</td>
                    <td className="px-4 py-2 text-muted">{row.responsable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
