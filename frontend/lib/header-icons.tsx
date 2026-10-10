/** Preset icons of the header menu constructor: the settings store a
 * kebab-case name (HEADER_ICONS in schemas/site-settings.schema.ts, same
 * list as the backend DTO) and the header maps it to a lucide component.
 * Unknown names fall back to the neutral circle. */
import {
  Circle,
  Gamepad2,
  Gift,
  Globe,
  Heart,
  Home,
  LayoutGrid,
  Mail,
  Newspaper,
  Percent,
  Phone,
  ShoppingCart,
  Star,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const HEADER_ICON_MAP: Record<string, LucideIcon> = {
  "layout-grid": LayoutGrid,
  wallet: Wallet,
  percent: Percent,
  newspaper: Newspaper,
  home: Home,
  "gamepad-2": Gamepad2,
  gift: Gift,
  star: Star,
  zap: Zap,
  "shopping-cart": ShoppingCart,
  heart: Heart,
  phone: Phone,
  mail: Mail,
  globe: Globe,
  circle: Circle,
};

export function headerIcon(name: string): LucideIcon {
  return HEADER_ICON_MAP[name] ?? Circle;
}
