/**
 * DOMAIN ENTITY — User
 * Representa el usuario autenticado del sistema FlotaPelileo.
 * Roles: 1=Oficinista, 2=Busero, 4=Supervisor, 5=Administrador
 */
export class User {
  constructor(data = {}) {
    this.id_usuario = data.id_usuario ?? null;
    this.nombre_usuario = data.nombre_usuario ?? '';
    this.correo_usuario = data.correo_usuario ?? '';
    this.rol_usuario = data.rol_usuario ?? null;
    this.nombre_rol = data.nombre_rol ?? '';
    this.nombre_canton = data.nombre_canton ?? '';
    this.nombre_sucursal = data.nombre_sucursal ?? '';
    this.nombre_oficina = data.nombre_oficina ?? '';
    this.punto_emision_boleteria = data.punto_emision_boleteria ?? '';
    this.punto_emision_guia = data.punto_emision_guia ?? '';
    this.ruc_empresa = data.ruc_empresa ?? '';
    this.imagen_empresa = data.imagen_empresa ?? null;
  }

  get isAdmin() { return this.rol_usuario === 5; }
  get isSupervisor() { return this.rol_usuario === 4; }
  get isOficinista() { return this.rol_usuario === 1; }
  get isBusero() { return this.rol_usuario === 2; }
  get canAccessFullView() { return [1, 4, 5].includes(this.rol_usuario); }
  get rolLabel() {
    const roles = { 1: 'OFICINISTA', 2: 'BUSERO', 4: 'SUPERVISOR', 5: 'ADMINISTRADOR' };
    return roles[this.rol_usuario] ?? 'USUARIO';
  }
}
