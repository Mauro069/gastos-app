import type { Gasto, UsdRates } from "./gasto";
import type { User } from "@supabase/supabase-js";

export interface HeaderProps {
  total: number;
  usdRate: number;
  usdRates: UsdRates;
  setUsdRates: (newRates: UsdRates) => void;
  monthKey: string;
  monthLabel: string;
  isPromedios: boolean;
  user: User | null;
  onSignOut: () => void;
  demo?: boolean;
  onSignIn?: () => void;
}

export interface GastosTableProps {
  gastos: Gasto[];
  selectedYear: number;
  selectedMonth: number;
  demo?: boolean;
}

export interface GastoModalProps {
  gasto: Gasto | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (
    data: Partial<Gasto> & {
      fecha: string;
      cantidad: number;
      forma: string;
      concepto: string;
      nota?: string;
    },
  ) => Promise<void>;
}

export interface ChartsProps {
  gastos: Gasto[];
  prevGastos: Gasto[];
  monthLabel: string;
  prevMonthLabel: string;
}

export interface PromediosProps {
  gastos: Gasto[];
  selectedYear: number;
  usdRates: UsdRates;
}

export interface LandingProps {
  // Landing has no props from parent
}

export interface LoginProps {
  // Login has no props from parent
}
