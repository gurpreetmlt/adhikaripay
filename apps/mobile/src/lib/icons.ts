import {
  Banknote,
  FileText,
  Landmark,
  Wallet,
  Smartphone,
  Send,
  Coins,
  Building2,
  ShieldCheck,
  CreditCard,
  Zap,
  Tv,
  Droplet,
  Flame,
  Car,
  Wifi,
  Fingerprint,
  GraduationCap,
  Gift,
  Fuel,
  HandCoins,
  Receipt,
  Users,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react-native";

const SERVICE_ICON: Record<string, LucideIcon> = {
  CASH_WITHDRAW: Banknote,
  MINI_STATEMENT: FileText,
  CASH_DEPOSIT: Landmark,
  BALANCE_ENQUIRY: Wallet,
  UPI_CASH_POINT: Smartphone,
  MONEY_TRANSFER: Send,
  CASH_COLLECTION: Coins,
  LOANS: Building2,
  INSURANCE: ShieldCheck,
  CREDIT_CARDS: CreditCard,
  MOBILE_PREPAID: Smartphone,
  ELECTRICITY: Zap,
  DTH: Tv,
  WATER: Droplet,
  GAS_PIPELINE: Flame,
  FASTAG_RECHARGE: Car,
  BROADBAND_POSTPAID: Wifi,
  AADHAAR_PAY: Fingerprint,
  LPG_CYLINDER: Fuel,
  EDUCATION_FEES: GraduationCap,
  DONATION: Gift,
};

const CATEGORY_ICON: Record<string, LucideIcon> = {
  landmark: Landmark,
  receipt: Receipt,
  fingerprint: Fingerprint,
  "building-2": Building2,
  users: Users,
};

export function getServiceIcon(code: string): LucideIcon {
  return SERVICE_ICON[code] ?? HandCoins;
}

export function getCategoryIcon(icon: string | null): LucideIcon {
  return (icon && CATEGORY_ICON[icon]) || LayoutGrid;
}
