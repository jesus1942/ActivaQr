import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Activos } from './pages/Activos';
import { ActivoDetalle } from './pages/ActivoDetalle';
import { Medicion } from './pages/Medicion';
import { Mantenimiento } from './pages/Mantenimiento';
import { Reportes } from './pages/Reportes';
import { ImportarDatos } from './pages/ImportarDatos';
import { GestionQR } from './pages/GestionQR';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="activos" element={<Activos />} />
          <Route path="activos/:id" element={<ActivoDetalle />} />
          <Route path="medicion" element={<Medicion />} />
          <Route path="medicion/:activoId" element={<Medicion />} />
          <Route path="mantenimiento" element={<Mantenimiento />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="importar" element={<ImportarDatos />} />
          <Route path="qr" element={<GestionQR />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
