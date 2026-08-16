// Struttura del piano generato — è il contratto tra il tool save_plan,
// il DB (colonna jsonb) e la pagina pubblica /plan/[slug].

export interface ProductRef {
  id: number | null; // id nella tabella products (null se non linkato)
  name: string;
  price: number;
  image_url?: string | null;
  deeplink?: string | null;
}

export interface PlanMaterial {
  name: string;
  quantity: number;
  unit: string; // l, kg, mq, ml, pz...
  packages?: number | null; // numero confezioni da comprare
  package_size?: number | null;
  calculation?: string | null; // spiegazione leggibile del calcolo
  products?: {
    eco?: ProductRef | null;
    mid?: ProductRef | null;
    premium?: ProductRef | null;
  } | null;
}

export interface PlanTool {
  name: string;
  optional?: boolean;
  product?: ProductRef | null;
}

export interface PlanPhase {
  n: number;
  title: string;
  description: string;
  duration?: string | null;
}

export interface RiskFlag {
  category: string; // elettrico | gas | strutturale | idraulico | altro
  reason: string;
}

export interface Plan {
  title: string;
  summary: string;
  difficulty: number; // 1-5
  estimated_time: string;
  risk: {
    requires_professional: boolean;
    flags: RiskFlag[];
  };
  phases: PlanPhase[];
  materials: PlanMaterial[];
  tools: PlanTool[];
  cost: {
    eco: number;
    mid: number;
    premium: number;
    currency: string;
  };
  notes?: string | null;
}

export interface StoredPlan {
  slug: string;
  title: string;
  plan: Plan;
  created_at: string;
}
