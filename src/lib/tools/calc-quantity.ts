// calc_quantity — calcolo deterministico delle quantità.
// Principio del prodotto: l'LLM orchestra, il codice calcola.
// L'LLM NON deve mai stimare quantità a testo libero: passa geometria e
// parametri di consumo (presi da material_specs) e riceve numeri esatti.

export interface CalcQuantityInput {
  mode: "direct" | "rectangle" | "walls" | "volume" | "count";
  // direct: value = quantità di lavoro già nota (es. 24 mq)
  value?: number;
  // rectangle: length_m x width_m (pavimenti, soffitti, aiuole)
  length_m?: number;
  width_m?: number;
  // walls: perimeter_m x height_m - openings_area_mq (pareti di una stanza)
  perimeter_m?: number;
  height_m?: number;
  openings_area_mq?: number;
  // volume: length_m x width_m x depth_m (getti, riporti). depth in metri.
  depth_m?: number;
  // parametri di consumo (da material_specs)
  consumption_per_unit: number; // materiale per unità di lavoro
  passes?: number; // mani/passate (default 1)
  waste_factor?: number; // scarto, es. 0.1 (default 0)
  thickness_multiplier?: number; // per materiali dosati "per cm/mm": spessore in cm o mm
  package_size?: number; // formato confezione per arrotondare
}

export interface CalcQuantityResult {
  work_amount: number;
  needed_quantity: number; // già inclusi passate, spessore e scarto
  packages: number | null;
  package_size: number | null;
  formula: string; // spiegazione trasparente del calcolo
}

function round(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function calcQuantity(input: CalcQuantityInput): CalcQuantityResult {
  const passes = input.passes ?? 1;
  const waste = input.waste_factor ?? 0;
  const thick = input.thickness_multiplier ?? 1;

  let work: number;
  let workDesc: string;

  switch (input.mode) {
    case "direct":
      if (input.value == null) throw new Error("mode=direct richiede value");
      work = input.value;
      workDesc = `quantità di lavoro: ${work}`;
      break;
    case "rectangle":
      if (input.length_m == null || input.width_m == null)
        throw new Error("mode=rectangle richiede length_m e width_m");
      work = input.length_m * input.width_m;
      workDesc = `area = ${input.length_m} × ${input.width_m} = ${round(work)} mq`;
      break;
    case "walls": {
      if (input.perimeter_m == null || input.height_m == null)
        throw new Error("mode=walls richiede perimeter_m e height_m");
      const openings = input.openings_area_mq ?? 0;
      work = input.perimeter_m * input.height_m - openings;
      workDesc = `area pareti = ${input.perimeter_m} × ${input.height_m} − ${openings} (aperture) = ${round(work)} mq`;
      break;
    }
    case "volume": {
      if (input.length_m == null || input.width_m == null || input.depth_m == null)
        throw new Error("mode=volume richiede length_m, width_m e depth_m");
      work = input.length_m * input.width_m * input.depth_m;
      workDesc = `volume = ${input.length_m} × ${input.width_m} × ${input.depth_m} = ${round(work, 3)} mc`;
      break;
    }
    case "count":
      if (input.value == null) throw new Error("mode=count richiede value");
      work = input.value;
      workDesc = `numero elementi: ${work}`;
      break;
    default:
      throw new Error(`mode sconosciuto: ${input.mode}`);
  }

  if (work <= 0) throw new Error("La quantità di lavoro risultante è <= 0: controlla le misure");

  const base = work * input.consumption_per_unit * passes * thick;
  const needed = base * (1 + waste);

  let packages: number | null = null;
  if (input.package_size && input.package_size > 0) {
    packages = Math.ceil(needed / input.package_size);
  }

  const formulaParts = [
    workDesc,
    `consumo = ${round(work)} × ${input.consumption_per_unit}` +
      (passes !== 1 ? ` × ${passes} passate` : "") +
      (thick !== 1 ? ` × ${thick} (spessore)` : "") +
      ` = ${round(base)}`,
    waste > 0 ? `con scarto +${round(waste * 100, 0)}% = ${round(needed)}` : null,
    packages != null ? `confezioni da ${input.package_size}: ${packages}` : null,
  ].filter(Boolean);

  return {
    work_amount: round(work, 3),
    needed_quantity: round(needed, 2),
    packages,
    package_size: input.package_size ?? null,
    formula: formulaParts.join("; "),
  };
}
