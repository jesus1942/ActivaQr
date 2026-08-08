import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  esRolPerfil,
  esTecnicoCampo,
  puedeAdministrarTenant,
  puedeCargarTrabajoCampo,
  puedeConsultarDireccion,
  puedeConsultarGestion,
  puedeGestionarConfiguracionTecnica,
  puedeGestionarOperacion,
} from './rolePolicy';

test('expone exactamente los cuatro perfiles seleccionables del tenant', () => {
  assert.equal(esRolPerfil('tecnico'), true);
  assert.equal(esRolPerfil('mantenimiento'), true);
  assert.equal(esRolPerfil('jefatura'), true);
  assert.equal(esRolPerfil('direccion'), true);
  assert.equal(esRolPerfil('admin'), false);
  assert.equal(esRolPerfil('superadmin'), false);
});

test('operador legado conserva el acceso de tecnico de campo', () => {
  assert.equal(esTecnicoCampo('operador'), true);
  assert.equal(esTecnicoCampo('tecnico'), true);
  assert.equal(puedeCargarTrabajoCampo('operador'), true);
  assert.equal(puedeGestionarOperacion('operador'), false);
});

test('mantenimiento opera sin administrar la estructura ni la cuenta', () => {
  assert.equal(puedeCargarTrabajoCampo('mantenimiento'), true);
  assert.equal(puedeGestionarOperacion('mantenimiento'), true);
  assert.equal(puedeGestionarConfiguracionTecnica('mantenimiento'), false);
  assert.equal(puedeAdministrarTenant('mantenimiento'), false);
  assert.equal(puedeConsultarGestion('mantenimiento'), false);
});

test('jefatura administra la estructura tecnica pero no la cuenta comercial', () => {
  assert.equal(puedeGestionarOperacion('jefatura'), true);
  assert.equal(puedeGestionarConfiguracionTecnica('jefatura'), true);
  assert.equal(puedeAdministrarTenant('jefatura'), false);
  assert.equal(puedeConsultarGestion('jefatura'), true);
  assert.equal(puedeConsultarDireccion('jefatura'), false);
});

test('direccion es un perfil de consulta', () => {
  assert.equal(puedeCargarTrabajoCampo('direccion'), false);
  assert.equal(puedeGestionarOperacion('direccion'), false);
  assert.equal(puedeGestionarConfiguracionTecnica('direccion'), false);
  assert.equal(puedeAdministrarTenant('direccion'), false);
  assert.equal(puedeConsultarGestion('direccion'), true);
  assert.equal(puedeConsultarDireccion('direccion'), true);
});

test('el backend bloquea transversalmente escrituras de Direccion', () => {
  const auth = fs.readFileSync(path.join(process.cwd(), 'src/auth.ts'), 'utf8');
  assert.match(auth, /actual\.rol === 'direccion'/);
  assert.match(auth, /perfil_solo_lectura/);
  assert.match(auth, /\['GET', 'HEAD', 'OPTIONS'\]\.includes\(req\.method\)/);
});

test('solo admin y superadmin gobiernan usuarios, suscripcion y politicas', () => {
  assert.equal(puedeAdministrarTenant('admin'), true);
  assert.equal(puedeAdministrarTenant('superadmin'), true);
  assert.equal(puedeAdministrarTenant('jefatura'), false);
  assert.equal(puedeAdministrarTenant('direccion'), false);
});

test('la interfaz y la API de personal comparten los cuatro perfiles', () => {
  const frontend = fs.readFileSync(path.join(process.cwd(), '../src/data/permisos.ts'), 'utf8');
  const personal = fs.readFileSync(path.join(process.cwd(), 'src/routes/operadores.ts'), 'utf8');
  for (const rol of ['tecnico', 'mantenimiento', 'jefatura', 'direccion']) {
    assert.match(frontend, new RegExp(`value: '${rol}'`));
  }
  assert.match(personal, /esRolPerfil\(rol\)/);
  assert.match(personal, /usuario\.rol === 'operador' \? 'tecnico'/);
});

test('el tecnico solo recibe sus ordenes y queda como autor de su medicion', () => {
  const tareas = fs.readFileSync(path.join(process.cwd(), 'src/routes/tareas.ts'), 'utf8');
  const mediciones = fs.readFileSync(path.join(process.cwd(), 'src/routes/mediciones.ts'), 'utf8');
  assert.match(tareas, /esTecnicoCampo\(auth\.rol\) \? \{ responsableId: auth\.userId \}/);
  assert.match(mediciones, /\(req as AuthRequest\)\.auth\?\.userId/);
});
