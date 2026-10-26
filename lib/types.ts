export type Config = {
  nombre: string; slogan: string; whatsapp: string; alias: string; cbu: string;
  titular: string; retiro: string; horario: string;
};
export type Producto = {
  id: string; nombre: string; descripcion: string; categoria: string; precio: number;
  imagenes: string[]; publicado: boolean; stock: number | null; orden: number; creado: string;
};
export type Item = { producto_id: string | null; nombre: string; precio: number; cantidad: number };
export type Estado = 'pendiente_pago' | 'reservado' | 'pagado' | 'entregado' | 'cancelado';
export type Metodo = 'mercadopago' | 'efectivo' | 'transferencia';
export type Pedido = {
  id: string; numero: number; cliente_id: string | null; cliente_nombre: string; cliente_telefono: string;
  items: Item[]; total: number; metodo: Metodo; estado: Estado; nota: string; origen: string;
  mp_preference_id: string | null; mp_init_point: string | null; mp_payment_id: string | null;
  stock_descontado: boolean; creado: string;
};
export type Cliente = {
  id: string; nombre: string; telefono: string; telefono_norm: string | null; email: string;
  direccion: string; cumple: string; como_nos_conocio: string; acepta_novedades: boolean;
  notas: string; origen: string; creado: string;
};
