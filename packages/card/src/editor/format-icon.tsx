'use client';

import {
  BadgeCheck,
  Contact,
  CreditCard,
  IdCard,
  IdCardLanyard,
  Ruler,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import type { CardFormat } from '../core';

const ICONS: Record<CardFormat, LucideIcon> = {
  membership: BadgeCheck,
  id: IdCard,
  bank: CreditCard,
  business: Contact,
  badge: IdCardLanyard,
  wallet: Wallet,
  custom: Ruler,
};

/** A format's icon, as the format pickers show it. */
export function FormatIcon({ format }: { format: CardFormat }) {
  const Icon = ICONS[format];
  return <Icon aria-hidden="true" />;
}
