# ActivaQR — Activos bajo control

> *"Cada máquina con su historia, cada mantenimiento con evidencia, cada falla antes de que suceda."*

---

## ¿De qué se trata?

ActivaQR nació de una idea simple: **las empresas no saben exactamente qué equipos tienen, en qué estado están, cuándo se revisaron por última vez ni qué pieza está por fallar.**

Y eso cuesta plata. Una máquina parada puede costar mucho más que haberla revisado a tiempo.

La idea es esta: le generás a cada activo de tu empresa — desde un motor de hormigonera hasta el equipo más sofisticado — una ficha propia con su código QR. El técnico escanea el QR en campo, carga los valores que correspondan (temperatura, amperaje, presión, vibración, observaciones, fotos), y la app hace el resto: historial, alertas, reportes y avisos de mantenimiento antes de que algo te explote o te pare la producción.

No reemplaza el SCADA. Lo complementa. Lee lo que la máquina informa **y** registra lo que el técnico ve con sus propios ojos.

---

## ¿Por qué existe?

Porque en muchas empresas el mantenimiento todavía se lleva en cuadernos, WhatsApp, memoria del empleado o planillas incompletas.

Porque un rodamiento que viene vibrando hace tres semanas no debería sorprender a nadie.

Porque la información existe — lo que falta es ordenarla, darle un lugar y convertirla en acción.

---

## ¿Qué hace la app?

### Para el técnico en campo
- Escanea el QR del equipo
- Ve la ficha técnica y los valores normales
- Carga la medición: temperatura, amperaje, presión, vibración, estado visual
- Saca fotos, deja observaciones, firma la intervención
- Funciona aunque haya mala señal

### Para el supervisor o jefe de mantenimiento
- Ve el estado de todos los activos en tiempo real
- Recibe alertas cuando un valor sale de rango
- Ve tendencias: si la temperatura viene subiendo en los últimos 3 controles, la app lo marca
- Sabe cuándo toca lubricación, cambio de rodamiento o revisión general
- Descarga reportes en PDF para auditorías, seguros o gerencia

### Para el dueño o gerente
- Sabe exactamente qué tiene, dónde está y cómo funciona
- Tiene evidencia de cada intervención
- Reduce paradas inesperadas y gastos de emergencia
- Puede mostrarle a un cliente o aseguradora el historial completo de sus equipos

---

## Activos que puede manejar

Cualquier cosa que tenga valores medibles y necesite mantenimiento:

- Motores eléctricos
- Compresores
- Bombas centrífugas
- Cámaras frigoríficas
- Tableros eléctricos
- Rodamientos
- Grupos electrógenos
- Cintas transportadoras
- Puentes grúa
- Equipos de refrigeración
- Máquinas viales
- Motores navales
- Calderas
- Variadores de frecuencia
- Cualquier equipo que hoy se controle en un cuaderno o en la memoria de alguien

---

## Pantallas principales

| Pantalla | Para qué sirve |
|---|---|
| **Dashboard** | Vista general: alertas, estado de flota, actividad reciente |
| **Activos** | Lista y fichas de todos los equipos con filtros y buscador |
| **Ficha del Activo** | Historial completo, gráficos de tendencia, QR imprimible |
| **Tomar Medición** | Formulario mobile-first para carga en campo desde QR |
| **Mantenimiento** | Tareas vencidas, pendientes y programadas |
| **Reportes** | Generación de PDF para gerencia, auditoría o seguros |
| **Gestión QR** | Impresión de etiquetas físicas para pegar en cada equipo |
| **Importar Datos** | Carga desde CSV para empresas que ya tienen registros |

---

## Integración con sistemas existentes

La app puede recibir datos automáticamente desde:

- **CSV / Excel** — la forma más simple: la empresa exporta y la app importa
- **API REST** — cualquier sistema puede enviar datos directamente
- **OPC UA / MQTT** — para integración industrial avanzada con SCADA o PLC
- **Bases de datos SQL** — conexión directa al histórico de planta

La app **solo lee datos, no interviene el proceso**. No toca el PLC, no modifica variables, no escribe comandos. Lee lo que la máquina informa y lo convierte en mantenimiento accionable.

---

## Stack técnico

- **Frontend:** React + TypeScript + Vite
- **Estilos:** Tailwind CSS
- **Gráficos:** Recharts
- **QR:** qrcode.react
- **Reportes PDF:** jsPDF
- **Routing:** React Router v6
- **Persistencia:** localStorage (MVP) → Railway + PostgreSQL (próximamente)
- **Deploy:** GitHub Pages con GitHub Actions

---

## Cómo correrla localmente

```bash
git clone https://github.com/jesus1942/activaqr.git
cd activaqr
npm install
npm run dev
```

Abre `http://localhost:5173` y ya tenés la app corriendo con datos de ejemplo.

---

## Contexto

Esta app fue pensada para el contexto industrial de la Patagonia argentina: pesqueras, frigoríficos, hormigoneras, constructoras, transporte, talleres, servicios petroleros, generación de energía. Lugares donde el mantenimiento es crítico, donde una parada no programada tiene costo real, y donde la gestión de activos todavía tiene mucho para mejorar.

La idea es arrancar simple: QR, ficha técnica, carga de campo, historial, alertas y reporte. Después crecer: análisis predictivo, integración con SCADA, módulo de repuestos, órdenes de trabajo, análisis de costos.

---

## Roadmap

- [x] MVP con activos, mediciones, QR y alertas
- [x] Deploy en GitHub Pages
- [ ] Backend en Railway + PostgreSQL (multiusuario real)
- [ ] App móvil nativa (React Native)
- [ ] Integración OPC UA / MQTT
- [ ] Análisis predictivo con tendencias automáticas
- [ ] Módulo de repuestos e inventario
- [ ] Órdenes de trabajo
- [ ] Notificaciones push
- [ ] Integración con SAP / Tango / otros ERP

---

## Idea original

La idea de ActivaQR es de **Natalia** — alguien que vio de cerca cómo se maneja el mantenimiento industrial en la práctica y entendió que había una forma mejor de hacerlo.

La app existe porque antes de pensar en código, alguien pensó en el problema real: el técnico frente a la máquina, el dueño que no sabe qué tiene, el jefe de mantenimiento que maneja todo en la cabeza, y la falla que nadie vio venir.

---

*ActivaQR — Puerto Madryn, Patagonia Argentina.*
