/**
 * Acquirer registry available in RF. `fields` defines the credential
 * inputs the admin store-settings form renders per provider; `live: true`
 * means the end-to-end integration is implemented (only the test emulator
 * for now — real acquirers store their config until integrated).
 */
export interface PaymentProviderField {
  key: string;
  label: string;
  /** Rendered as a secret input in the admin form. */
  secret?: boolean;
}

export interface PaymentProviderMeta {
  id: string;
  name: string;
  fields: PaymentProviderField[];
  live: boolean;
}

export const PAYMENT_PROVIDERS: PaymentProviderMeta[] = [
  {
    id: 'test',
    name: 'Тестовый магазин (эмуляция)',
    fields: [],
    live: true,
  },
  {
    id: 'tbank',
    name: 'Т-Банк (EACQ)',
    fields: [
      { key: 'terminalKey', label: 'Terminal Key' },
      { key: 'password', label: 'Пароль терминала', secret: true },
    ],
    live: false,
  },
  {
    id: 'yoomoney',
    name: 'ЮMoney (Сбер)',
    fields: [
      { key: 'shopId', label: 'shopId' },
      { key: 'secretKey', label: 'secretKey', secret: true },
    ],
    live: false,
  },
  {
    id: 'yookassa',
    name: 'ЮKassa',
    fields: [
      { key: 'shopId', label: 'shopId' },
      { key: 'secretKey', label: 'API-ключ', secret: true },
    ],
    live: false,
  },
  {
    id: 'cloudpayments',
    name: 'CloudPayments',
    fields: [
      { key: 'publicId', label: 'Public ID' },
      { key: 'apiSecret', label: 'API Secret', secret: true },
    ],
    live: false,
  },
  {
    id: 'robokassa',
    name: 'Robokassa',
    fields: [
      { key: 'login', label: 'Логин' },
      { key: 'password1', label: 'Пароль #1', secret: true },
      { key: 'password2', label: 'Пароль #2', secret: true },
    ],
    live: false,
  },
];
