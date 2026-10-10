/** Fixed rows of PC game system requirements — shared by the admin
 * product form (editing) and the product detail page (rendering). The
 * keys map 1:1 to the backend systemRequirements JSON shape. */
export const SYSREQ_ROWS = [
  { key: "os", label: "Система", placeholder: "Windows 10 64-bit" },
  { key: "cpu", label: "Процессор", placeholder: "Intel Core i5-8400 / AMD Ryzen 3 3300X" },
  { key: "gpu", label: "Видеокарта", placeholder: "GeForce GTX 1060 3 ГБ" },
  { key: "ram", label: "Оперативная память", placeholder: "12 ГБ" },
  { key: "storage", label: "Место на диске", placeholder: "60 ГБ" },
] as const;

export type SysReqKey = (typeof SYSREQ_ROWS)[number]["key"];
