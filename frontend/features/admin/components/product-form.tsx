"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/features/auth/hooks/use-me";
import { toCents } from "@/lib/money";
import { productTagLabel } from "@/lib/product-tags";
import { revalidateStorefrontTags } from "@/lib/revalidate";
import { SECTIONS } from "@/lib/sections";
import { SYSREQ_ROWS, type SysReqKey } from "@/lib/system-requirements";
import { useAdminProductMutations } from "../hooks/use-admin-products";
import { useListValues } from "../hooks/use-admin-list-values";
import { useCategories } from "../hooks/use-admin-categories";
import {
  adminReplaceProductFaq,
  type AdminProduct,
} from "@/services/products.service";
import { ProductImagesField } from "./product-images-field";
import { ProductFaqField } from "./product-faq-field";
import { ProductKeysField } from "./product-keys-field";
import {
  productSchema,
  type ProductFormValues,
} from "@/schemas/product.schema";
import type { SystemRequirementsRow } from "@/types/api";

export const PRODUCT_STATUS_LABELS = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликован",
  ARCHIVED: "В архиве",
} as const;

/** A tier form value = the five string fields (empty = not filled). */
type SysReqTierValues = Record<SysReqKey, string>;

function sysReqTierFormValues(
  row: SystemRequirementsRow | undefined,
): SysReqTierValues {
  return {
    os: row?.os ?? "",
    cpu: row?.cpu ?? "",
    gpu: row?.gpu ?? "",
    ram: row?.ram ?? "",
    storage: row?.storage ?? "",
  };
}

/** Trimmed tier for the API payload; undefined when nothing is filled. */
function sysReqTierPayload(
  tier: SysReqTierValues,
): SystemRequirementsRow | undefined {
  const entries = SYSREQ_ROWS.map(({ key }) => [key, tier[key].trim()] as const);
  const filled = entries.filter(([, value]) => value);
  if (filled.length === 0) return undefined;
  return Object.fromEntries(filled);
}

export const PRODUCT_KIND_LABELS = {
  GAME_KEY: "Ключ / код активации",
  TOPUP_NOMINAL: "Пополнение по номиналам",
  TOPUP_AMOUNT: "Пополнение по сумме",
} as const;

const ACCOUNT_KIND_LABELS = {
  "": "Не требуется (ключевые товары)",
  LOGIN: "Логин аккаунта",
  ID: "ID игрока",
  EMAIL: "Email получателя",
} as const;

/** Multi-select of registry values rendered as a checkbox list (the
 * product stores the slugs; options come from the «Списки» registry). */
function MultiListField({
  label,
  hint,
  values,
  options,
  onToggle,
}: {
  label: string;
  hint?: string;
  values: string[];
  options: { slug: string; name: string }[];
  onToggle: (slug: string) => void;
}) {
  return (
    <fieldset className="border-border space-y-2 rounded-xl border p-3">
      <legend className="text-muted-foreground px-1 text-xs font-medium">
        {label}
      </legend>
      {options.length > 0 ? (
        <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
          {options.map((option) => (
            <label
              key={option.slug}
              className="hover:bg-raised/40 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm"
            >
              <Checkbox
                checked={values.includes(option.slug)}
                onCheckedChange={() => onToggle(option.slug)}
              />
              {option.name}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Список пуст — заполните его в «Категории» → «Списки».
        </p>
      )}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </fieldset>
  );
}

function formValuesFrom(product: AdminProduct): ProductFormValues {
  return {
    title: product.title,
    slug: product.slug,
    description: product.description ?? "",
    instruction: product.instruction ?? "",
    platform: product.platform ?? "",
    genre: product.genre,
    consoles: product.consoles,
    tags: product.tags[0] ?? "",
    cashbackPercent: product.cashbackPercent ? String(product.cashbackPercent) : "",
    releaseYear: product.releaseYear != null ? String(product.releaseYear) : "",
    rating: product.rating != null ? String(product.rating) : "",
    tagline: product.tagline ?? "",
    group: product.group ?? "",
    features: product.features,
    searchAliases: product.searchAliases.join(", "),
    systemRequirements: {
      minimum: sysReqTierFormValues(product.systemRequirements?.minimum),
      recommended: sysReqTierFormValues(product.systemRequirements?.recommended),
    },
    images: product.images,
    priceRub: (product.priceCents / 100).toString(),
    oldPriceRub: product.oldPriceCents ? (product.oldPriceCents / 100).toString() : "",
    stock: String(product.stock),
    status: product.status,
    kind: product.kind,
    minAmountRub: product.minValue != null ? (product.minValue / 100).toString() : "",
    maxAmountRub: product.maxValue != null ? (product.maxValue / 100).toString() : "",
    creditingMode: product.creditingMode,
    accountFieldKind: product.accountFieldKind ?? "",
    accountFieldLabel: product.accountFieldLabel ?? "",
    accountFieldHint: product.accountFieldHint ?? "",
    variants: product.variants.map((variant) => ({
      label: variant.label,
      value: variant.value != null ? String(variant.value) : "",
      unit: variant.unit ?? "",
      priceRub: (variant.priceCents / 100).toString(),
      oldPriceRub: variant.oldPriceCents ? (variant.oldPriceCents / 100).toString() : "",
    })),
    faq: (product.faq ?? []).map((item) => ({
      id: crypto.randomUUID(),
      question: item.question,
      answer: item.answer,
    })),
    categoryId: product.categoryId,
  };
}

const EMPTY_VALUES: ProductFormValues = {
  title: "",
  slug: "",
    description: "",
    instruction: "",
    platform: "",
    genre: [],
    consoles: [],
    tags: "",
    cashbackPercent: "",
    releaseYear: "",
    rating: "",
    tagline: "",
    group: "",
    features: [],
    searchAliases: "",
  systemRequirements: {
    minimum: sysReqTierFormValues(undefined),
    recommended: sysReqTierFormValues(undefined),
  },
  images: [],
  priceRub: "",
  oldPriceRub: "",
  stock: "0",
  status: "DRAFT",
  kind: "GAME_KEY",
  minAmountRub: "",
  maxAmountRub: "",
  creditingMode: "AUTO_CODE",
  accountFieldKind: "",
  accountFieldLabel: "",
  accountFieldHint: "",
  variants: [],
  faq: [],
  categoryId: "",
};

interface ProductFormProps {
  /** Absent on the create page. */
  product?: AdminProduct;
}

/** Admin create/edit product form. Ruble strings convert to kopecks and
 * the comma-separated genre field to an array before hitting the API.
 * The kind decides the checkout: keys (quantity), nominals (variant
 * list) or an amount range — plus the account field top-up buyers fill. */
export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { create, update } = useAdminProductMutations();
  const categories = useCategories();
  const lists = useListValues();
  // Raw key values are SUPER_ADMIN-only (the keys API enforces it) —
  // the field is hidden from plain ADMINs instead of showing a 403.
  const { data: user } = useMe();
  const [error, setError] = useState<string | null>(null);
  const editMode = product !== undefined;
  // Once a product row exists (created here or loaded), every submit
  // updates it — a retry after a failed FAQ save must not duplicate it.
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const productId = product?.id ?? savedProductId;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? formValuesFrom(product) : EMPTY_VALUES,
  });
  const errors = form.formState.errors;
  const kind = form.watch("kind");
  const variantsArray = useFieldArray({ control: form.control, name: "variants" });

  /** The fixed section (раздел) is derived from the selected category and
   * doubles as its filter; it is UI-only — the API payload carries just
   * categoryId. The override lets the admin re-target the product while
   * it loads (categories arrive async). */
  const categoryOptions = categories.data ?? [];
  const selectedCategory = categoryOptions.find(
    (category) => category.id === form.watch("categoryId"),
  );
  const [sectionOverride, setSectionOverride] = useState<string | null>(null);
  const section = sectionOverride ?? selectedCategory?.type ?? "";
  const sectionCategories = section
    ? categoryOptions.filter((category) => category.type === section)
    : categoryOptions;

  const changeSection = (value: string) => {
    setSectionOverride(value);
    // The current category may not belong to the new section — drop it so
    // the admin re-picks (the schema requires a category).
    if (
      value &&
      !categoryOptions.some(
        (category) => category.type === value && category.id === form.watch("categoryId"),
      )
    ) {
      form.setValue("categoryId", "");
    }
  };

  /** Registry values by kind; a saved value missing from the registry
   * stays selectable so an edit round-trip doesn't silently drop it. */
  const optionsFor = (kindOf: string): { slug: string; name: string }[] =>
    (lists.data ?? [])
      .filter((value) => value.kind === kindOf)
      .map((value) => ({ slug: value.slug, name: value.name }));

  const withSaved = (
    kindOf: string,
    saved: string | undefined,
  ): { slug: string; name: string }[] => {
    const options = optionsFor(kindOf);
    if (saved && !options.some((option) => option.slug === saved)) {
      return [{ slug: saved, name: saved }, ...options];
    }
    return options;
  };

  const toggleValue = (field: "genre" | "consoles" | "features", slug: string) => {
    const current = form.getValues(field);
    form.setValue(
      field,
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  };

  /** Splits a comma-separated form field into a clean string list. */
  const splitList = (value: string): string[] =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  async function onSubmit(values: ProductFormValues) {
    setError(null);
    const isTopUp = values.kind !== "GAME_KEY";
    const minimumReq = sysReqTierPayload(values.systemRequirements.minimum);
    const recommendedReq = sysReqTierPayload(values.systemRequirements.recommended);
    const input = {
      title: values.title,
      slug: values.slug || undefined,
      description: values.description.trim() || undefined,
      instruction: values.instruction.trim() || undefined,
      platform: values.platform.trim() || undefined,
      genre: values.genre,
      consoles: values.consoles,
      // Selects use a single-space «no value» item (Radix forbids "") —
      // trim it away here.
      tags: values.tags.trim() ? [values.tags.trim()] : [],
      cashbackPercent: values.cashbackPercent ? Number(values.cashbackPercent) : 0,
      releaseYear: values.releaseYear ? Number(values.releaseYear) : null,
      rating: values.rating ? Number(values.rating.replace(",", ".")) : null,
      tagline: values.tagline.trim() || null,
      group: values.group.trim() || null,
      features: values.features,
      searchAliases: splitList(values.searchAliases),
      systemRequirements:
        minimumReq || recommendedReq
          ? {
              ...(minimumReq ? { minimum: minimumReq } : {}),
              ...(recommendedReq ? { recommended: recommendedReq } : {}),
            }
          : null,
      images: values.images,
      priceCents: toCents(values.priceRub),
      oldPriceCents: values.oldPriceRub ? toCents(values.oldPriceRub) : null,
      stock: Number(values.stock),
      status: values.status,
      kind: values.kind,
      minValue: values.kind === "TOPUP_AMOUNT" && values.minAmountRub ? toCents(values.minAmountRub) : null,
      maxValue: values.kind === "TOPUP_AMOUNT" && values.maxAmountRub ? toCents(values.maxAmountRub) : null,
      creditingMode: values.creditingMode,
      accountFieldKind: isTopUp && values.accountFieldKind ? values.accountFieldKind : null,
      accountFieldLabel: isTopUp && values.accountFieldLabel.trim() ? values.accountFieldLabel.trim() : null,
      accountFieldHint: isTopUp && values.accountFieldHint.trim() ? values.accountFieldHint.trim() : null,
      variants:
        values.kind === "TOPUP_NOMINAL"
          ? values.variants.map((variant) => ({
              label: variant.label,
              value: variant.value ? Number(variant.value) : null,
              unit: variant.unit.trim() || null,
              priceCents: toCents(variant.priceRub),
              oldPriceCents: variant.oldPriceRub ? toCents(variant.oldPriceRub) : null,
            }))
          : [],
      categoryId: values.categoryId,
    };
    // Empty rows are dropped here — the FAQ DTO rejects empty questions;
    // the backend re-trims and re-filters on top.
    const faq = values.faq
      .map(({ question, answer }) => ({
        question: question.trim(),
        answer: answer.trim(),
      }))
      .filter((row) => row.question !== "" && row.answer !== "");
    try {
      let id = productId;
      if (id) {
        await update.mutateAsync({ id, input });
      } else {
        const created = await create.mutateAsync(input);
        id = created.id;
        setSavedProductId(id);
      }
      // The FAQ list replaces wholesale on every save of an existing
      // product; a fresh product gets it only when rows were filled.
      if (productId || faq.length > 0) {
        await adminReplaceProductFaq(id, faq);
      }
      void revalidateStorefrontTags(["products"]);
      router.push("/admin/products");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    }
  }

  if (categories.isPending || lists.isPending) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (categories.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить категории: {categories.error.message}
      </p>
    );
  }
  if (lists.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить списки значений: {lists.error.message}
      </p>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Название</Label>
          <Input id="title" placeholder="Cyberpunk 2077" {...form.register("title")} />
          {errors.title ? (
            <p className="text-destructive text-xs">{errors.title.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" placeholder="cyberpunk-2077" {...form.register("slug")} />
          {errors.slug ? (
            <p className="text-destructive text-xs">{errors.slug.message}</p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Пусто — сгенерируется из названия. Страница товара:
            /products/&lt;slug&gt;
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Раздел</Label>
          <Select
            value={section}
            onValueChange={changeSection}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите раздел" />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Разделы заданы системой: Игры, Подписки, Валюта и пополнение.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Категория</Label>
          <Select
            value={form.watch("categoryId")}
            onValueChange={(value) => form.setValue("categoryId", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              {sectionCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId ? (
            <p className="text-destructive text-xs">{errors.categoryId.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>Статус</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) =>
              form.setValue("status", value as ProductFormValues["status"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Витрина показывает только «Опубликован».
          </p>
        </div>
      </section>

      {/* Тип товара и выдача */}
      <section className="border-border bg-canvas/40 rounded-2xl border p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Тип товара и выдача</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Тип</Label>
            <Select
              value={kind}
              onValueChange={(value) =>
                form.setValue("kind", value as ProductFormValues["kind"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRODUCT_KIND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Ключ — покупают по количеству, код из пула ниже. Номиналы —
              выбор пакета. Сумма — покупатель вводит сумму пополнения.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Выдача</Label>
            <Select
              value={form.watch("creditingMode")}
              onValueChange={(value) =>
                form.setValue("creditingMode", value as ProductFormValues["creditingMode"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO_CODE">Автоматически (код из пула)</SelectItem>
                <SelectItem value="MANUAL">Вручную (оператор после оплаты)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Ручной режим — для пополнений, где нет интеграции с
              поставщиком; ключи и гифт-коды выдавайте автоматически.
            </p>
          </div>
        </div>

        {kind === "TOPUP_AMOUNT" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="minAmountRub">Минимальная сумма, ₽</Label>
              <Input
                id="minAmountRub"
                inputMode="decimal"
                placeholder="50"
                {...form.register("minAmountRub")}
              />
              {errors.minAmountRub ? (
                <p className="text-destructive text-xs">
                  {errors.minAmountRub.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxAmountRub">Максимальная сумма, ₽</Label>
              <Input
                id="maxAmountRub"
                inputMode="decimal"
                placeholder="14000"
                {...form.register("maxAmountRub")}
              />
              {errors.maxAmountRub ? (
                <p className="text-destructive text-xs">
                  {errors.maxAmountRub.message}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {kind !== "GAME_KEY" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Поле аккаунта</Label>
              <Select
                value={form.watch("accountFieldKind")}
                onValueChange={(value) =>
                  form.setValue(
                    "accountFieldKind",
                    value as ProductFormValues["accountFieldKind"],
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountFieldLabel">Подпись поля</Label>
              <Input
                id="accountFieldLabel"
                placeholder="Логин Steam"
                {...form.register("accountFieldLabel")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountFieldHint">Подсказка под полем</Label>
              <Input
                id="accountFieldHint"
                placeholder="Проверьте внимательно…"
                {...form.register("accountFieldHint")}
              />
            </div>
          </div>
        ) : null}

        {kind === "TOPUP_NOMINAL" ? (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Номиналы</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Пакеты на выбор покупателя — «60 UC», «1 месяц», «1000 ₽».
                  Порядок списка = порядок на витрине.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={variantsArray.fields.length >= 100}
                onClick={() =>
                  variantsArray.append({
                    label: "",
                    value: "",
                    unit: "",
                    priceRub: "",
                    oldPriceRub: "",
                  })
                }
              >
                <Plus className="size-4" aria-hidden />
                Добавить номинал
              </Button>
            </div>
            {errors.variants?.message ? (
              <p className="text-destructive mt-2 text-xs">
                {errors.variants.message}
              </p>
            ) : null}
            {variantsArray.fields.length > 0 ? (
              <div className="mt-3 space-y-2">
                {variantsArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border-border bg-surface grid grid-cols-[1fr_repeat(3,80px)_100px_36px] items-start gap-2 rounded-xl border p-3"
                  >
                    <div className="space-y-1">
                      <Input
                        placeholder="Название («60 UC»)"
                        aria-label={`Номинал ${index + 1}: название`}
                        {...form.register(`variants.${index}.label`)}
                      />
                      {errors.variants?.[index]?.label ? (
                        <p className="text-destructive text-xs">
                          {errors.variants[index]?.label?.message}
                        </p>
                      ) : null}
                    </div>
                    <Input
                      placeholder="60"
                      aria-label={`Номинал ${index + 1}: значение`}
                      {...form.register(`variants.${index}.value`)}
                    />
                    <Input
                      placeholder="UC"
                      aria-label={`Номинал ${index + 1}: единица`}
                      {...form.register(`variants.${index}.unit`)}
                    />
                    <div className="space-y-1">
                      <Input
                        placeholder="86"
                        inputMode="decimal"
                        aria-label={`Номинал ${index + 1}: цена`}
                        {...form.register(`variants.${index}.priceRub`)}
                      />
                      {errors.variants?.[index]?.priceRub ? (
                        <p className="text-destructive text-xs">
                          {errors.variants[index]?.priceRub?.message}
                        </p>
                      ) : null}
                    </div>
                    <Input
                      placeholder="Цена до скидки"
                      inputMode="decimal"
                      aria-label={`Номинал ${index + 1}: цена до скидки`}
                      {...form.register(`variants.${index}.oldPriceRub`)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      aria-label={`Удалить номинал ${index + 1}`}
                      onClick={() => variantsArray.remove(index)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-3 text-xs">
                Номиналов пока нет — добавьте хотя бы один перед публикацией.
              </p>
            )}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="priceRub">Цена, ₽ {kind === "TOPUP_AMOUNT" ? "(минимальная на витрине)" : kind === "TOPUP_NOMINAL" ? "(«от» на витрине)" : ""}</Label>
          <Input id="priceRub" inputMode="decimal" placeholder="1299" {...form.register("priceRub")} />
          {errors.priceRub ? (
            <p className="text-destructive text-xs">{errors.priceRub.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oldPriceRub">Цена до скидки, ₽</Label>
          <Input id="oldPriceRub" inputMode="decimal" placeholder="2599" {...form.register("oldPriceRub")} />
          {errors.oldPriceRub ? (
            <p className="text-destructive text-xs">{errors.oldPriceRub.message}</p>
          ) : null}
          <p className="text-muted-foreground text-xs">Пусто — без скидки.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock">Количество, шт. {kind !== "GAME_KEY" ? "(не используется для пополнений)" : ""}</Label>
          <Input id="stock" inputMode="numeric" {...form.register("stock")} />
          {errors.stock ? (
            <p className="text-destructive text-xs">{errors.stock.message}</p>
          ) : null}
        </div>
      </section>

      {/* Атрибуты из справочников «Списки»: значения — селекты, слаги
          хранятся у товара и обслуживают фильтры каталога. */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="platform">Платформа</Label>
          <Select
            value={form.watch("platform")}
            onValueChange={(value) => form.setValue("platform", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Без платформы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Без платформы</SelectItem>
              {withSaved("platform", form.watch("platform") || undefined).map((option) => (
                <SelectItem key={option.slug} value={option.slug}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Значения настраиваются в «Категории» → «Списки».
          </p>
        </div>
        <MultiListField
          label="Жанры"
          values={form.watch("genre")}
          options={withSaved("genre", undefined)}
          onToggle={(slug) => toggleValue("genre", slug)}
        />
        <div className="space-y-1.5">
          <Label htmlFor="releaseYear">Год выхода</Label>
          <Input id="releaseYear" inputMode="numeric" placeholder="2025" {...form.register("releaseYear")} />
          {errors.releaseYear ? (
            <p className="text-destructive text-xs">{errors.releaseYear.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rating">Рейтинг карточки (0–5)</Label>
          <Input id="rating" inputMode="decimal" placeholder="4.8" {...form.register("rating")} />
          {errors.rating ? (
            <p className="text-destructive text-xs">{errors.rating.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cashbackPercent">Кешбэк, %</Label>
          <Input id="cashbackPercent" inputMode="numeric" placeholder="5" {...form.register("cashbackPercent")} />
          {errors.cashbackPercent ? (
            <p className="text-destructive text-xs">{errors.cashbackPercent.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>Метка карточки</Label>
          <Select
            value={form.watch("tags")}
            onValueChange={(value) => form.setValue("tags", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Без метки" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Без метки</SelectItem>
              {withSaved("tags", form.watch("tags") || undefined).map((option) => (
                <SelectItem key={option.slug} value={option.slug}>
                  {productTagLabel(option.slug) === option.slug
                    ? option.name
                    : productTagLabel(option.slug)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Варианты настраиваются в «Категории» → «Списки» → «Метки».
          </p>
        </div>
        <MultiListField
          label="Консоли"
          values={form.watch("consoles")}
          options={withSaved("consoles", undefined)}
          onToggle={(slug) => toggleValue("consoles", slug)}
        />
        <div className="space-y-1.5">
          <Label htmlFor="searchAliases">Алиасы поиска</Label>
          <Input id="searchAliases" placeholder="пс плюс, ps plus, плейстейшн" {...form.register("searchAliases")} />
          <p className="text-muted-foreground text-xs">Через запятую; точное совпадение в поиске.</p>
        </div>
      </section>

      {/* Подписочный блок: только у раздела «Подписки». */}
      {section === "subscriptions" ? (
        <section className="border-border bg-canvas/40 grid gap-4 rounded-2xl border p-4 sm:p-6 lg:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <h2 className="text-sm font-semibold">Подписка</h2>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Подзаголовок</Label>
            <Input id="tagline" placeholder="Онлайн-игра, каталог игр для PS4 и PS5" {...form.register("tagline")} />
          </div>
          <div className="space-y-1.5">
            <Label>Группа подписки</Label>
            <Select
              value={form.watch("group")}
              onValueChange={(value) => form.setValue("group", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Без группы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Без группы</SelectItem>
                {withSaved("subscription-group", form.watch("group") || undefined).map((option) => (
                  <SelectItem key={option.slug} value={option.slug}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <MultiListField
              label="Что входит"
              values={form.watch("features")}
              options={withSaved("subscription-includes", undefined)}
              onToggle={(slug) => toggleValue("features", slug)}
            />
          </div>
        </section>
      ) : null}

      {kind === "GAME_KEY" ? (
        <section className="space-y-3">
          <div>
            <Label>Системные требования</Label>
            <p className="text-muted-foreground text-xs">
              Показываются блоком на странице игры; пустые поля скрываются. Для консольных игр
              (PS, Xbox, Switch) оставьте оба уровня пустыми.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(["minimum", "recommended"] as const).map((tier) => (
              <div key={tier} className="border-border space-y-3 rounded-2xl border p-4">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  {tier === "minimum" ? "Минимальные" : "Рекомендуемые"}
                </p>
                {SYSREQ_ROWS.map((row) => (
                  <div key={row.key} className="space-y-1.5">
                    <Label htmlFor={`sysreq-${tier}-${row.key}`}>{row.label}</Label>
                    <Input
                      id={`sysreq-${tier}-${row.key}`}
                      placeholder={row.placeholder}
                      {...form.register(`systemRequirements.${tier}.${row.key}`)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <Label>Обложки</Label>
        <ProductImagesField
          value={form.watch("images")}
          onChange={(urls) => form.setValue("images", urls)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            rows={6}
            placeholder="Что это за игра и что входит в покупку"
            {...form.register("description")}
          />
          {errors.description ? (
            <p className="text-destructive text-xs">{errors.description.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instruction">Инструкция активации</Label>
          <Textarea
            id="instruction"
            rows={6}
            placeholder="1. Скачайте Steam… 2. Активируйте ключ…"
            {...form.register("instruction")}
          />
          {errors.instruction ? (
            <p className="text-destructive text-xs">{errors.instruction.message}</p>
          ) : null}
        </div>
      </section>

      {user?.role === "SUPER_ADMIN" &&
      product &&
      product.kind === "GAME_KEY" &&
      product.creditingMode === "AUTO_CODE" ? (
        <ProductKeysField productId={product.id} />
      ) : null}
      <ProductFaqField form={form} />

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={create.isPending || update.isPending} className="gap-2">
          {create.isPending || update.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {editMode ? "Сохранить" : "Создать товар"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/products">Отмена</Link>
        </Button>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </form>
  );
}
