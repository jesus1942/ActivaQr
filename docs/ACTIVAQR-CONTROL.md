# ActivaQR Control

Versión actual del módulo: **ActivaQR Control multimarcas**.

Módulo premium multi-tenant para telemetría, alarmas y operación gobernada de equipos industriales. La licencia se habilita por empresa y se factura de forma independiente del plan base de ActivaQR.

## Alcance de la primera versión

- Consola Superadmin para habilitar, configurar precios y suspender el servicio por tenant.
- Límites contractuales de gateways y dispositivos.
- Retención histórica configurable y detección de equipos sin comunicación.
- Tablero responsive para tablet, celular y escritorio.
- Integración HTTPS directa para Milesight UG65 y dispositivos genéricos.
- Sincronización REST real de SONOFF TH Elite mediante eWeLink Open API v2.
- Sincronización Tuya / Smart Life Cloud por empresa para sensores, medidores e interruptores compatibles.
- Autodescubrimiento, variables actuales, gráficos de 24 horas y estado de señal/batería.
- Reglas con umbral, demora sostenida, severidad y notificación push.
- Reconocimiento y resolución automática de alarmas.
- Solicitudes de comandos auditadas y bloqueadas hasta habilitar contrato, dispositivo y adaptador.

## Aislamiento por empresa

Cada integración, dispositivo, variable, lectura, regla, alarma, escena y comando conserva `empresaId`. Las rutas del tenant obtienen esa identidad desde la sesión autenticada; no aceptan que el navegador elija otra empresa. Por eso una empresa nueva no puede listar, configurar ni operar los dispositivos de Escuela Nueva Austral. Sólo el Superadmin puede consultar resúmenes globales desde rutas administrativas separadas.

Las credenciales también pertenecen a una integración de una sola empresa y se guardan cifradas. Cada tenant debe vincular su propia cuenta o proyecto del fabricante.

## Variable obligatoria en Railway

```text
IOT_CREDENTIALS_KEY=<secreto-aleatorio-largo-y-exclusivo-de-produccion>
```

No debe reutilizar `JWT_SECRET`, una contraseña humana ni una clave de proveedor. Si falta, ActivaQR rechaza el guardado de credenciales sin conservar nada.

## Milesight UG65 por HTTPS

1. El Superadmin habilita ActivaQR Control para la empresa.
2. El administrador del tenant crea un conector “Milesight TS30x + UG65”.
3. Genera el endpoint de ingesta y lo copia una sola vez.
4. En el UG65 crea la aplicación LoRaWAN y asigna los TS301/TS302.
5. Configura Data Transmission por HTTP/HTTPS hacia el endpoint.
6. Habilita el decoder para que el cuerpo lleve `devEUI` y valores escalares decodificados.

Ejemplo aceptado:

```json
{
  "devEUI": "24E124725E123456",
  "deviceName": "Cámara 1",
  "timestamp": "2026-08-10T13:00:00.000Z",
  "object": {
    "temperature": -21.4,
    "door": false,
    "battery": 92
  },
  "rssi": -73
}
```

También se aceptan las variables dentro de `readings` o `data`. Si el gateway envía solamente payload LoRaWAN en Base64, el endpoint responde 422: primero debe configurarse el decoder correspondiente al TS30x.

Rotar el token invalida inmediatamente el anterior. ActivaQR conserva sólo su hash y los últimos seis caracteres como referencia.

## SONOFF TH Elite / eWeLink

La cuenta debe autorizar un proyecto creado en eWeLink Developer Center. El conector guarda cifrados:

- App ID.
- App Secret.
- Access Token OAuth.
- Región (`us`, `eu`, `as` o `cn`).

La URL de redirección registrada en eWeLink debe ser exactamente:

```text
https://api.activaqr.net/api/iot/ewelink/oauth/callback
```

Desde el tablero, el administrador carga APPID y APP SECRET y elige “Autorizar con eWeLink”. ActivaQR valida un estado firmado de cinco minutos, intercambia el código OAuth antes de sus 30 segundos de vencimiento, cifra Access Token y Refresh Token, ejecuta la primera sincronización y luego renueva los tokens automáticamente.

“Sincronizar ahora” consulta el endpoint oficial `GET /v2/device/thing`, importa equipos SONOFF/CoolKit autorizados y normaliza `currentTemperature`, `currentHumidity`, `switch` y `online`.

El servidor también ejecuta sincronización programada. El tenant puede elegir 1, 5, 15 o 60 minutos; el valor inicial es 5 minutos. Un intervalo menor consume más rápidamente la cuota del APPID. Para datos inmediatos y sin polling, la vía prioritaria sigue siendo Milesight/HTTPS o un gateway local.

El Access Token vence y debe reemplazarse al expirar. La autorización empresarial, cuotas y modelos visibles dependen del contrato eWeLink. No se debe prometer a un cliente compatibilidad con modelos no devueltos por su APPID.

## Tuya / Smart Life Cloud

El administrador del tenant crea una conexión “Tuya / Smart Life Cloud” y carga las credenciales de un proyecto Tuya IoT Cloud vinculado a su cuenta Smart Life:

- Access ID / Client ID.
- Access Secret.
- UID de la cuenta vinculada.
- Región del proyecto: América, Europa, China o India.

ActivaQR cifra esas credenciales, solicita y renueva el token de acceso, descubre los dispositivos del UID y consulta estados y especificaciones. Normaliza temperatura, humedad, apertura magnética, inundación, movimiento, batería, corriente, voltaje, potencia, energía e interruptores. El intervalo inicial es de 30 segundos y puede configurarse desde 10 segundos.

La operación de interruptores usa el endpoint de comandos de Tuya y conserva las mismas barreras de contrato, dispositivo, perfil, confirmación y auditoría que eWeLink. La compatibilidad final depende de que el producto y su categoría estén expuestos por el proyecto Tuya del cliente.

## Otras marcas

Milesight y cualquier gateway o dispositivo capaz de enviar JSON decodificado por HTTPS pueden integrarse hoy para monitoreo, historial y alarmas. Control remoto y escenas no se habilitan para una marca solamente por declararla compatible: requieren un adaptador certificado que traduzca el comando, compruebe la identidad del equipo y devuelva un resultado auditable.

## Seguridad operativa

La activación del módulo no habilita control remoto. Para registrar una maniobra deben cumplirse simultáneamente:

1. `controlRemotoHabilitado` en el contrato del tenant.
2. `permiteControl` en el dispositivo específico.
3. Perfil Administrador o Jefatura.
4. Motivo explícito.
5. Adaptador certificado para ejecutar el comando.

Los adaptadores certificados de eWeLink y Tuya ejecutan la orden y registran su resultado. PLC, controlador frigorífico, presostatos, térmicos, parada de emergencia e interbloqueos locales conservan siempre la autoridad.

## Puesta en producción

1. Crear `IOT_CREDENTIALS_KEY` en Railway.
2. Ejecutar la migración `20260810130000_activaqr_control`.
3. Desplegar backend y frontend de la misma versión.
4. Ingresar como Superadmin y abrir **Control industrial**.
5. Configurar contrato, límites, retención y umbral de desconexión.
6. Activar el tenant recién cuando estén definidos alcance y precio.
7. Probar primero con monitoreo; habilitar control solamente después del relevamiento eléctrico y de automatización.
