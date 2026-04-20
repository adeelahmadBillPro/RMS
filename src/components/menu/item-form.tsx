"use client";

import * as React from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  itemCreateSchema,
  itemUpdateSchema,
  type ItemCreateInput,
} from "@/lib/validations/menu.schema";
import { createItemAction, updateItemAction } from "@/server/actions/menu.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import type { CategoryRow, ItemRow } from "./types";

interface Props {
  slug: string;
  initial: ItemRow | null;
  categories: CategoryRow[];
  onDone: () => void;
}

type FormShape = ItemCreateInput & { id?: string };

function paisaToRupees(c: number) {
  return c / 100;
}

export function ItemForm({ slug, initial, categories, onDone }: Props) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    watch,
    formState: { errors, isValid },
  } = useForm<FormShape>({
    resolver: zodResolver(isEdit ? itemUpdateSchema : itemCreateSchema) as Resolver<FormShape>,
    mode: "onBlur",
    defaultValues: {
      id: initial?.id,
      categoryId: initial?.categoryId ?? categories[0]?.id ?? "",
      name: initial?.name ?? "",
      nameUr: initial?.nameUr ?? "",
      description: initial?.description ?? "",
      photoUrl: initial?.photoUrl ?? "",
      prepTimeMinutes: initial?.prepTimeMinutes ?? 10,
      isAvailable: initial?.isAvailable ?? true,
      variants:
        initial?.variants.map((v) => ({
          id: v.id,
          name: v.name,
          priceRupees: paisaToRupees(v.priceCents),
          isDefault: v.isDefault,
          isAvailable: v.isAvailable,
        })) ?? [
          { name: "Regular", priceRupees: 0, isDefault: true, isAvailable: true },
        ],
      modifierGroups:
        initial?.modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          required: g.required,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          modifiers: g.modifiers.map((m) => ({
            id: m.id,
            name: m.name,
            priceDeltaRupees: paisaToRupees(m.priceDeltaCents),
            isAvailable: m.isAvailable,
          })),
        })) ?? [],
    },
  });

  const variantArray = useFieldArray({ control, name: "variants" });
  const groupArray = useFieldArray({ control, name: "modifierGroups" });
  const variantsValue = watch("variants");

  function setDefaultVariant(idx: number) {
    variantsValue.forEach((_, i) => setValue(`variants.${i}.isDefault`, i === idx));
  }

  async function onSubmit(values: FormShape) {
    setSubmitting(true);
    setServerError(null);
    const payload = isEdit ? values : (values as ItemCreateInput);
    const res = isEdit
      ? await updateItemAction(slug, payload)
      : await createItemAction(slug, payload);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [k, m] of Object.entries(res.fieldErrors)) {
          // dot-paths from server map to RHF nested keys
          setError(k as keyof FormShape, { message: m });
        }
      }
      setSubmitting(false);
      return;
    }
    toast({ variant: "success", title: isEdit ? "Item updated" : "Item created" });
    onDone();
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="max-h-[80vh] space-y-4 overflow-y-auto pr-1"
    >
      {serverError ? (
        <div className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger" role="alert">
          {serverError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="name" required>Name</Label>
          <Input id="name" invalid={!!errors.name} {...register("name")} />
          <FieldError message={errors.name?.message} />
        </FormField>
        <FormField>
          <Label htmlFor="categoryId" required>Category</Label>
          <select
            id="categoryId"
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            {...register("categoryId")}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <FieldError message={errors.categoryId?.message} />
        </FormField>
      </div>

      <FormField>
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register("description")} />
        <FieldError message={errors.description?.message} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="photoUrl">Photo URL</Label>
          <Input id="photoUrl" placeholder="https://…" {...register("photoUrl")} />
          <FieldError message={errors.photoUrl?.message} />
        </FormField>
        <FormField>
          <Label htmlFor="prepTimeMinutes">Prep time (min)</Label>
          <Input
            id="prepTimeMinutes"
            type="number"
            min={1}
            max={180}
            {...register("prepTimeMinutes", { valueAsNumber: true })}
          />
          <FieldError message={errors.prepTimeMinutes?.message} />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          {...register("isAvailable")}
        />
        <span>Available on menu</span>
      </label>

      {/* Variants */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Variants</h4>
            <p className="text-xs text-foreground-muted">At least one variant. Mark exactly one as default.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              variantArray.append({
                name: "",
                priceRupees: 0,
                isDefault: false,
                isAvailable: true,
              })
            }
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {typeof errors.variants?.message === "string" ? (
          <p className="mb-2 text-xs text-danger">{errors.variants.message}</p>
        ) : null}
        <ul className="space-y-2">
          {variantArray.fields.map((v, i) => (
            <li
              key={v.id}
              className="grid grid-cols-12 items-end gap-2 rounded-md border border-border bg-background p-2"
            >
              <div className="col-span-5">
                <Input
                  placeholder="Variant name"
                  invalid={!!errors.variants?.[i]?.name}
                  {...register(`variants.${i}.name` as const)}
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  invalid={!!errors.variants?.[i]?.priceRupees}
                  {...register(`variants.${i}.priceRupees` as const, { valueAsNumber: true })}
                />
              </div>
              <label className="col-span-2 flex items-center gap-1 text-xs text-foreground-muted">
                <input
                  type="radio"
                  name="variant-default"
                  className="h-3.5 w-3.5"
                  checked={!!variantsValue[i]?.isDefault}
                  onChange={() => setDefaultVariant(i)}
                />
                Default
              </label>
              <label className="col-span-1 flex items-center gap-1 text-xs text-foreground-muted">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  {...register(`variants.${i}.isAvailable` as const)}
                />
                On
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={variantArray.fields.length === 1}
                onClick={() => variantArray.remove(i)}
                aria-label="Remove variant"
                className="col-span-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Modifier groups */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Modifier groups</h4>
            <p className="text-xs text-foreground-muted">Optional. e.g. Toppings, Spice level.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              groupArray.append({
                name: "",
                required: false,
                minSelect: 0,
                maxSelect: 1,
                modifiers: [],
              })
            }
          >
            <Plus className="h-3 w-3" /> Add group
          </Button>
        </div>
        {typeof errors.modifierGroups?.message === "string" ? (
          <p className="mb-2 text-xs text-danger">{errors.modifierGroups.message}</p>
        ) : null}
        <ul className="space-y-3">
          {groupArray.fields.map((g, gIdx) => (
            <ModifierGroupEditor
              key={g.id}
              gIdx={gIdx}
              register={register}
              control={control}
              onRemove={() => groupArray.remove(gIdx)}
              errors={errors}
            />
          ))}
        </ul>
        {groupArray.fields.length === 0 ? (
          <p className="text-xs text-foreground-muted">No modifier groups yet.</p>
        ) : null}
      </div>

      <div className="sticky bottom-0 -mx-1 flex justify-between gap-3 border-t border-border bg-background px-1 pt-3">
        {isEdit ? <Badge variant="info">Editing — saving replaces all variants & modifiers</Badge> : <span />}
        <Button type="submit" loading={submitting} disabled={!isValid}>
          {isEdit ? "Save changes" : "Create item"}
        </Button>
      </div>
    </form>
  );
}

// Inline group editor — split out to keep the parent component manageable.
function ModifierGroupEditor({
  gIdx,
  register,
  control,
  onRemove,
  errors,
}: {
  gIdx: number;
  register: ReturnType<typeof useForm<FormShape>>["register"];
  control: ReturnType<typeof useForm<FormShape>>["control"];
  onRemove: () => void;
  errors: ReturnType<typeof useForm<FormShape>>["formState"]["errors"];
}) {
  const modifiers = useFieldArray({ control, name: `modifierGroups.${gIdx}.modifiers` });
  return (
    <li className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 grid grid-cols-12 items-end gap-2">
        <div className="col-span-5">
          <Input
            placeholder="Group name (e.g. Toppings)"
            {...register(`modifierGroups.${gIdx}.name` as const)}
          />
        </div>
        <label className="col-span-2 flex items-center gap-1 text-xs text-foreground-muted">
          <input
            type="checkbox"
            className="h-3.5 w-3.5"
            {...register(`modifierGroups.${gIdx}.required` as const)}
          />
          Required
        </label>
        <FieldHintInline label="Min">
          <Input
            type="number"
            min={0}
            max={20}
            className="h-9"
            {...register(`modifierGroups.${gIdx}.minSelect` as const, { valueAsNumber: true })}
          />
        </FieldHintInline>
        <FieldHintInline label="Max">
          <Input
            type="number"
            min={1}
            max={20}
            className="h-9"
            {...register(`modifierGroups.${gIdx}.maxSelect` as const, { valueAsNumber: true })}
          />
        </FieldHintInline>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onRemove}
          aria-label="Remove group"
          className="col-span-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ul className="space-y-1">
        {modifiers.fields.map((m, mIdx) => (
          <li
            key={m.id}
            className="grid grid-cols-12 items-end gap-2 rounded-md border border-border bg-surface p-2"
          >
            <div className="col-span-6">
              <Input
                placeholder="Modifier"
                {...register(`modifierGroups.${gIdx}.modifiers.${mIdx}.name` as const)}
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                step="0.01"
                placeholder="±Price"
                {...register(`modifierGroups.${gIdx}.modifiers.${mIdx}.priceDeltaRupees` as const, {
                  valueAsNumber: true,
                })}
              />
            </div>
            <label className="col-span-2 flex items-center gap-1 text-xs text-foreground-muted">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                {...register(`modifierGroups.${gIdx}.modifiers.${mIdx}.isAvailable` as const)}
              />
              On
            </label>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => modifiers.remove(mIdx)}
              aria-label="Remove modifier"
              className="col-span-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-2"
        onClick={() =>
          modifiers.append({ name: "", priceDeltaRupees: 0, isAvailable: true })
        }
      >
        <Plus className="h-3 w-3" /> Add modifier
      </Button>
      {errors.modifierGroups?.[gIdx] ? (
        <FieldError
          message={
            typeof errors.modifierGroups[gIdx]?.message === "string"
              ? (errors.modifierGroups[gIdx]?.message as string)
              : undefined
          }
        />
      ) : null}
    </li>
  );
}

function FieldHintInline({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="col-span-2">
      <label className="mb-1 block text-xs text-foreground-muted">{label}</label>
      {children}
    </div>
  );
}
