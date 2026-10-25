/**
 * What gold buys (design doc, "Gems, gold and XP"): outfits and vehicles for
 * each title, a souvenir album per region, and a hint in a quiz. Gold never
 * buys a flag, a level or an exam pass.
 */
import type { Cefr } from "../engine";

export interface Articolo {
  id: string;
  kind: "outfit" | "souvenir";
  name: string;
  /** the region that must be reached first */
  region: Cefr;
  price: number;
  line: string;
}

export const BOTTEGA: Articolo[] = [
  { id: "zaino", kind: "outfit", name: "Lo zaino del Turista", region: "A1", price: 30, line: "Con la mappa nella tasca davanti." },
  { id: "bicicletta", kind: "outfit", name: "La bicicletta del Viandante", region: "A2", price: 80, line: "Per i portici e le mura di Ferrara." },
  { id: "vespa", kind: "outfit", name: "La Vespa dell'Ospite", region: "B1", price: 180, line: "Verde menta, per le colline toscane." },
  { id: "chiavi", kind: "outfit", name: "Le chiavi del Residente", region: "B2", price: 300, line: "Di un appartamento con terrazzo a Roma." },

  { id: "gondola", kind: "souvenir", name: "Una gondola", region: "A1", price: 40, line: "Venezia, in miniatura." },
  { id: "maschera", kind: "souvenir", name: "Una maschera di Carnevale", region: "A1", price: 55, line: "Oro e bianco, da Venezia." },
  { id: "tortellini", kind: "souvenir", name: "Una scatola di tortellini", region: "A2", price: 60, line: "Fatti a mano a Bologna." },
  { id: "due-torri", kind: "souvenir", name: "Le Due Torri", region: "A2", price: 75, line: "Asinelli e Garisenda, la più storta." },
  { id: "torre-pisa", kind: "souvenir", name: "La Torre di Pisa", region: "B1", price: 90, line: "Pende anche questa." },
  { id: "fiasco", kind: "souvenir", name: "Un fiasco di Chianti", region: "B1", price: 70, line: "Con la paglia intorno." },
  { id: "colosseo", kind: "souvenir", name: "Il Colosseo", region: "B2", price: 120, line: "Cinquantamila spettatori, in un palmo." },
  { id: "bocca", kind: "souvenir", name: "La Bocca della Verità", region: "B2", price: 100, line: "Non metterci la mano se hai mentito." },
];

export const articolo = (id: string) => BOTTEGA.find((a) => a.id === id);

/** A hint in a quiz removes two wrong options; that answer then pays no gem. */
export const HINT_PRICE = 10;
