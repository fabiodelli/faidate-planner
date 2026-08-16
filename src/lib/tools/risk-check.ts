// risk_check — classificazione deterministica del rischio normativo.
// Se il progetto tocca categorie regolamentate attiva il flag "serve un
// professionista" e il disclaimer. Regole a keyword, volutamente prudenti.

export interface RiskCheckInput {
  project_description: string;
  phases?: string[];
}

export interface RiskFlagResult {
  category: "elettrico" | "gas" | "strutturale" | "idraulico" | "amianto" | "quota";
  reason: string;
  blocking: boolean; // true = il piano NON deve dare istruzioni operative su questa parte
}

export interface RiskCheckResult {
  requires_professional: boolean;
  flags: RiskFlagResult[];
  disclaimer: string;
}

interface Rule {
  category: RiskFlagResult["category"];
  blocking: boolean;
  keywords: RegExp;
  reason: string;
}

const RULES: Rule[] = [
  {
    category: "elettrico",
    blocking: true,
    keywords:
      /(impiant\w+ elettric|quadro elettric|salvavita|differenzial|magnetoterm|cablagg|scatola di derivazione|nuova presa|spostare (una |la )?presa|interruttor\w+ (a )?muro|punto luce|220v|380v|messa a terra|contatore)/i,
    reason:
      "Interventi sull'impianto elettrico richiedono un elettricista abilitato e dichiarazione di conformità (DM 37/08).",
  },
  {
    category: "gas",
    blocking: true,
    keywords:
      /(impiant\w+ (a |del )?gas|tubo del gas|caldaia|scaldabagno a gas|piano cottura.{0,20}(allacc|collega|installa)|metano|gpl|canna fumaria)/i,
    reason:
      "Interventi su impianti a gas e apparecchi a combustione richiedono un tecnico abilitato (DM 37/08) — rischio esplosione e monossido.",
  },
  {
    category: "strutturale",
    blocking: true,
    keywords:
      /(muro portante|parete portante|demolir\w+ (un |il |la )?(muro|parete|solaio)|apertura nel muro|trave|pilastro|solaio|cordolo|fondazion|cemento armato|balcone.{0,20}(amplia|demolis))/i,
    reason:
      "Interventi su elementi strutturali richiedono un ingegnere/geometra e pratiche edilizie (CILA/SCIA).",
  },
  {
    category: "idraulico",
    blocking: false,
    keywords:
      /(spostare (il |lo |la )?(wc|water|bidet|lavandino|doccia|vasca)|colonna di scarico|modificare (lo |gli )?scarich|rifacimento bagno|nuovo bagno|allaccio idric|autoclave)/i,
    reason:
      "Modifiche alla distribuzione idrica o agli scarichi sono complesse: errori causano perdite e danni. Valuta un idraulico; piccole manutenzioni (sifoni, flessibili, silicone) restano fai-da-te.",
  },
  {
    category: "amianto",
    blocking: true,
    keywords: /(amianto|eternit|onduline in fibrocemento)/i,
    reason:
      "La rimozione di amianto è vietata ai privati: serve una ditta specializzata iscritta all'albo gestori ambientali.",
  },
  {
    category: "quota",
    blocking: false,
    keywords: /(tetto|copertura del tetto|grondaia|oltre .{0,10}metri|trabattell|ponteggio|facciata)/i,
    reason:
      "Lavori in quota (>2 m) comportano rischio caduta: servono DPI adeguati e valutazione attenta; per tetti e facciate valuta un professionista.",
  },
];

export const STANDARD_DISCLAIMER =
  "Questo piano è generato con l'aiuto di un'AI e può contenere errori. Verifica sempre quantità, istruzioni e normative locali prima di iniziare. Per lavori su impianti elettrici, gas o elementi strutturali rivolgiti esclusivamente a professionisti abilitati.";

export function riskCheck(input: RiskCheckInput): RiskCheckResult {
  const text = [input.project_description, ...(input.phases ?? [])].join("\n");
  const flags: RiskFlagResult[] = [];

  for (const rule of RULES) {
    if (rule.keywords.test(text)) {
      flags.push({ category: rule.category, reason: rule.reason, blocking: rule.blocking });
    }
  }

  return {
    requires_professional: flags.some((f) => f.blocking),
    flags,
    disclaimer: STANDARD_DISCLAIMER,
  };
}
