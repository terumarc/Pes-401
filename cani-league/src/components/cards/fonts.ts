import { Archivo, Archivo_Black, Silkscreen } from "next/font/google";

/** Letras de la carta: la de Monopoly para títulos y órdenes, píxel para las etiquetas. */
export const cardDisplay = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-card-display" });
export const cardBody = Archivo({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-card-body" });
export const cardPixel = Silkscreen({ subsets: ["latin"], weight: "400", variable: "--font-card-pixel" });
