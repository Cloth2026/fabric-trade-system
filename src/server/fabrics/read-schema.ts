import { z } from "zod";
import { AppError } from "../errors";

const emptyStringToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalSearchText = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().max(200).optional(),
);
const configFilter = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).max(100).default("all"),
);
const positiveInteger = (defaultValue: number, maximum?: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(1).max(maximum ?? Number.MAX_SAFE_INTEGER).default(defaultValue),
  );

export const fabricListQuerySchema = z
  .object({
    q: optionalSearchText,
    fabricType: z.preprocess(
      emptyStringToUndefined,
      z.enum(["knitted", "woven", "all"]).default("all"),
    ),
    status: configFilter,
    developmentSource: configFilter,
    completeness: z.preprocess(
      emptyStringToUndefined,
      z.enum(["all", "complete", "needs_attention"]).default("all"),
    ),
    page: positiveInteger(1),
    pageSize: positiveInteger(50, 100),
  })
  .strict();

export type FabricListQuery = z.infer<typeof fabricListQuerySchema>;

export function parseFabricListQuery(input: unknown) {
  const parsed = fabricListQuerySchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(400, "Invalid fabric list query.", z.treeifyError(parsed.error));
  }

  return parsed.data;
}
