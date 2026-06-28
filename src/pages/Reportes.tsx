// v1.1.0
import React, { useState } from 'react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Download } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { jsPDF } from 'jspdf';
import { exportarCsv } from '../utils/exportCsv';

export const Reportes: React.FC = () => {
  const { activos, mediciones, getSectorNombre, getTecnicoNombre } = useActivos();
  const [desde, setDesde] = useState(format(new Date(Date.now() - 30 * 24 * 3600 * 1000), 'yyyy-MM-dd'));
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedActivos, setSelectedActivos] = useState<string[]>(activos.map((a) => a.id));
  const [preview, setPreview] = useState(false);

  const toggleActivo = (id: string) => {
    setSelectedActivos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredMediciones = mediciones.filter((m) => {
    if (!selectedActivos.includes(m.activoId)) return false;
    const d = parseISO(m.fecha);
    return isAfter(d, parseISO(desde)) && isBefore(d, parseISO(hasta));
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ActivaQR — Reporte de Activos Industriales', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${desde} al ${hasta}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth / 2, 36, { align: 'center' });

    let y = 48;

    selectedActivos.forEach((activoId) => {
      const activo = activos.find((a) => a.id === activoId);
      if (!activo) return;

      const activoMeds = filteredMediciones.filter((m) => m.activoId === activoId);

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Activo header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y - 5, pageWidth - 28, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(`${activo.codigo} — ${activo.nombre}`, 17, y + 1);
      doc.setTextColor(0, 0, 0);
      y += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Sector: ${getSectorNombre(activo.sectorId)} | Responsable: ${getTecnicoNombre(activo.responsableId)} | Estado: ${activo.estado.toUpperCase()}`, 14, y + 4);
      y += 10;

      if (activoMeds.length === 0) {
        doc.text('Sin mediciones en el período seleccionado.', 14, y + 4);
        y += 10;
      } else {
        // Table header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
        doc.text('Fecha', 16, y + 5);
        doc.text('Temp.', 50, y + 5);
        doc.text('Amperaje', 75, y + 5);
        doc.text('Presión', 105, y + 5);
        doc.text('Vibración', 130, y + 5);
        doc.text('Estado', 162, y + 5);
        doc.text('Técnico', 180, y + 5);
        y += 8;

        doc.setFont('helvetica', 'normal');
        activoMeds.forEach((med) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(format(parseISO(med.fecha), 'dd/MM/yyyy'), 16, y + 4);
          doc.text(`${med.temperatura}°C`, 50, y + 4);
          doc.text(med.amperaje > 0 ? `${med.amperaje}A` : '-', 75, y + 4);
          doc.text(med.presion > 0 ? `${med.presion} bar` : '-', 105, y + 4);
          doc.text(med.vibracion, 130, y + 4);
          doc.text(med.estado.toUpperCase(), 162, y + 4);
          doc.text(getTecnicoNombre(med.tecnicoId), 180, y + 4);
          y += 7;
        });
      }
      y += 6;
    });

    doc.save(`ActivaQR-Reporte-${desde}-${hasta}.pdf`);
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-content uppercase tracking-tight mb-2">Reportes</h1>
      <p className="text-muted text-sm mb-6">Genera reportes de mediciones y estado de activos</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1">
          <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-content">Parámetros</h2>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full border border-line px-3 py-1.5 text-sm outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full border border-line px-3 py-1.5 text-sm outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted">Activos</label>
                <button
                  onClick={() => setSelectedActivos(selectedActivos.length === activos.length ? [] : activos.map((a) => a.id))}
                  className="text-xs text-brand-600 font-bold"
                >
                  {selectedActivos.length === activos.length ? 'Ninguno' : 'Todos'}
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {activos.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 cursor-pointer hover:bg-subtle p-1">
                    <input
                      type="checkbox"
                      checked={selectedActivos.includes(a.id)}
                      onChange={() => toggleActivo(a.id)}
                      className="border border-line-strong"
                    />
                    <span className="text-xs font-mono font-bold">{a.codigo}</span>
                    <span className="text-xs text-muted truncate">{a.nombre}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setPreview(true)}
                className="w-full flex items-center justify-center gap-2 border border-line px-4 py-2.5 font-bold text-content hover:bg-subtle transition-colors"
              >
                <FileText size={16} />
                Vista Previa
              </button>
              <button
                onClick={generatePDF}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white px-4 py-2.5 font-bold border border-line shadow-soft hover:bg-warn transition-colors"
              >
                <Download size={16} />
                Descargar PDF
              </button>
              <button
                onClick={() => exportarCsv(
                  `mediciones-${desde}-${hasta}`,
                  filteredMediciones.map((m) => {
                    const activo = activos.find((a) => a.id === m.activoId);
                    return {
                      Fecha: format(parseISO(m.fecha), 'dd/MM/yyyy HH:mm', { locale: es }),
                      Codigo: activo?.codigo ?? '', Activo: activo?.nombre ?? '',
                      Sector: getSectorNombre(activo?.sectorId ?? ''),
                      Temperatura: m.temperatura ?? '', Amperaje: m.amperaje ?? '',
                      Presion: m.presion ?? '', Vibracion: m.vibracion,
                      Voltaje: m.voltaje ?? '', Bateria: m.porcentajeBateria ?? '',
                      Estado: m.estado, Tecnico: getTecnicoNombre(m.tecnicoId),
                      Observaciones: m.observaciones ?? '',
                    };
                  })
                )}
                className="w-full flex items-center justify-center gap-2 border border-line px-4 py-2.5 font-bold text-content hover:bg-subtle transition-colors"
              >
                <Download size={16} />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          {preview ? (
            <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-6">
              {/* Document-style preview */}
              <div className="border-b-4 border-line pb-4 mb-6">
                <h2 className="text-2xl font-black text-content text-center uppercase">ActivaQR</h2>
                <h3 className="text-sm font-bold text-center text-muted uppercase tracking-widest">Reporte de Activos Industriales</h3>
                <div className="text-xs text-center text-faint mt-1">
                  Período: {desde} al {hasta} · Generado: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
                </div>
              </div>

              <div className="text-sm space-y-6">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-center">
                  <div className="flex-1 border border-line p-3">
                    <div className="text-3xl font-black text-brand-600">{selectedActivos.length}</div>
                    <div className="text-xs uppercase text-muted font-bold mt-1">Activos</div>
                  </div>
                  <div className="flex-1 border border-line p-3">
                    <div className="text-3xl font-black text-brand-700 dark:text-brand-300">{filteredMediciones.length}</div>
                    <div className="text-xs uppercase text-muted font-bold mt-1">Mediciones</div>
                  </div>
                </div>

                {selectedActivos.map((activoId) => {
                  const activo = activos.find((a) => a.id === activoId);
                  if (!activo) return null;
                  const meds = filteredMediciones.filter((m) => m.activoId === activoId);
                  return (
                    <div key={activoId}>
                      <div className="bg-slate-900 text-white px-3 py-2 flex justify-between items-center gap-2">
                        <span className="font-mono font-bold flex-shrink-0">{activo.codigo}</span>
                        <span className="text-sm truncate min-w-0 flex-1 text-center">{activo.nombre}</span>
                        <span className="text-xs text-faint flex-shrink-0 whitespace-nowrap">{meds.length} mediciones</span>
                      </div>
                      {meds.length > 0 ? (
                        <div className="overflow-x-auto">
                        <table className="w-full text-xs border-l-2 border-r-2 border border-line">
                          <thead>
                            <tr className="bg-subtle">
                              <th className="text-left px-2 py-1.5 font-bold uppercase">Fecha</th>
                              <th className="text-left px-2 py-1.5 font-bold uppercase">Temp.</th>
                              <th className="text-left px-2 py-1.5 font-bold uppercase">Amp.</th>
                              <th className="text-left px-2 py-1.5 font-bold uppercase">Estado</th>
                              <th className="text-left px-2 py-1.5 font-bold uppercase">Técnico</th>
                            </tr>
                          </thead>
                          <tbody>
                            {meds.map((m) => (
                              <tr key={m.id} className="border-t border-line">
                                <td className="px-2 py-1 font-mono">{format(parseISO(m.fecha), 'dd/MM/yyyy')}</td>
                                <td className="px-2 py-1 font-mono font-bold">{m.temperatura}°C</td>
                                <td className="px-2 py-1 font-mono">{m.amperaje > 0 ? `${m.amperaje}A` : '-'}</td>
                                <td className="px-2 py-1 font-semibold uppercase text-xs">{m.estado}</td>
                                <td className="px-2 py-1">{getTecnicoNombre(m.tecnicoId)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      ) : (
                        <div className="border-l-2 border-r-2 border border-line px-3 py-2 text-faint text-xs">Sin mediciones en el período</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 border border-dashed border-line text-faint">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Configura los parámetros y haz clic en Vista Previa</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
