/**
 * Editorial vocabulary shared by the planner (server) and the planner UI
 * (client). Pure module — no Prisma — so the client component can import
 * the labels without pulling the database layer into the browser bundle.
 */

export const PILLAR_LABELS: Record<string, string> = {
  proceso: "Proceso",
  estilo: "Estilo",
  prueba_social: "Prueba social",
  promo: "Promo",
  detras_camaras: "Detrás de cámaras",
  sorteo: "Sorteo",
  novedad: "Novedad",
};

export const OBJECTIVE_LABELS: Record<string, string> = {
  alcance: "Alcance",
  interaccion: "Interacción",
  conversion: "Conversión",
  seguidores: "Seguidores",
};

export const FORMAT_LABELS: Record<string, string> = {
  post: "Post",
  carrusel: "Carrusel",
  reel: "Reel",
  historia: "Historia",
};

export const CHANNEL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  both: "Ambos",
};

export const PILLARS = [
  "proceso",
  "estilo",
  "prueba_social",
  "promo",
  "detras_camaras",
  "sorteo",
  "novedad",
];

export const FORMATS = ["post", "carrusel", "reel", "historia"];

export const OBJECTIVES = ["alcance", "interaccion", "conversion", "seguidores"];

export const CHANNELS = ["instagram", "facebook", "both"];
