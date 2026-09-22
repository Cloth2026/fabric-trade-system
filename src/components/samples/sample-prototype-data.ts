import type {
  SampleRequestDetailRecord,
  SampleRequestItemInput,
  SampleRequestPayload,
  SampleRequestRecord,
} from "@/lib/api/sample-client";
import type { SampleFeedbackResult, SampleRequestStatus } from "@/server/samples/constants";
import {
  sampleFeedbackResultLabels,
  sampleRequestStatusLabels,
} from "@/server/samples/constants";

export type SampleItemDraft = {
  key: string;
  fabricId: string;
  fabricCode: string;
  fabricName: string;
  quantity: string;
  colorOrRemark: string;
};

export type SampleFormState = {
  customerId: string;
  customerName: string;
  contactId: string;
  contactName: string;
  purpose: string;
  expectedReturnAt: string;
  carrier: string;
  trackingNo: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  remark: string;
  items: SampleItemDraft[];
};

let draftKeySeed = 0;

export function createEmptySampleItem(): SampleItemDraft {
  draftKeySeed += 1;
  return { key: `item-${draftKeySeed}`, fabricId: "", fabricCode: "", fabricName: "", quantity: "", colorOrRemark: "" };
}

export function createEmptySampleFormState(): SampleFormState {
  return {
    customerId: "",
    customerName: "",
    contactId: "",
    contactName: "",
    purpose: "",
    expectedReturnAt: "",
    carrier: "",
    trackingNo: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    remark: "",
    items: [createEmptySampleItem()],
  };
}

export type SampleFormErrors = Partial<Record<"customerId" | "items" | "quantity", string>> & {
  itemErrors?: Record<string, string>;
};

export function validateSampleForm(state: SampleFormState): SampleFormErrors {
  const errors: SampleFormErrors = {};
  if (!state.customerId.trim()) errors.customerId = "请选择寄样客户";

  const fabricIds = state.items.map((item) => item.fabricId.trim()).filter(Boolean);
  if (fabricIds.length === 0) {
    errors.items = "至少要寄出一支面料";
  } else if (new Set(fabricIds).size !== fabricIds.length) {
    errors.items = "同一张寄样单里不要重复添加同一支面料";
  }

  const itemErrors: Record<string, string> = {};
  state.items.forEach((item) => {
    if (!item.fabricId.trim()) {
      itemErrors[item.key] = "请选择面料";
      return;
    }
    const quantity = item.quantity.trim();
    if (quantity && (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0)) {
      itemErrors[item.key] = "数量必须是大于 0 的数字";
    }
  });
  if (Object.keys(itemErrors).length > 0) errors.itemErrors = itemErrors;

  return errors;
}

const orNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export function sampleFormToPayload(state: SampleFormState): SampleRequestPayload {
  return {
    customerId: state.customerId.trim(),
    contactId: orNull(state.contactId),
    purpose: orNull(state.purpose),
    expectedReturnAt: state.expectedReturnAt ? new Date(state.expectedReturnAt).toISOString() : null,
    carrier: orNull(state.carrier),
    trackingNo: orNull(state.trackingNo),
    receiverName: orNull(state.receiverName),
    receiverPhone: orNull(state.receiverPhone),
    receiverAddress: orNull(state.receiverAddress),
    remark: orNull(state.remark),
    items: state.items
      .filter((item) => item.fabricId.trim())
      .map<SampleRequestItemInput>((item) => ({
        fabricId: item.fabricId.trim(),
        quantity: orNull(item.quantity),
        colorOrRemark: orNull(item.colorOrRemark),
      })),
  };
}

export function formatSampleDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function formatSampleQuantity(item: { quantity: number | null; unit: string | null }) {
  if (item.quantity === null) return "—";
  return `${item.quantity}${item.unit ?? ""}`;
}

export const sampleStatusTones: Record<SampleRequestStatus, string> = {
  preparing: "bg-amber-50/82 text-amber-800",
  shipped: "bg-blue-50/82 text-blue-800",
  delivered: "bg-violet-50/82 text-violet-800",
  returned: "bg-emerald-50/82 text-emerald-800",
  closed: "bg-stone-200/72 text-stone-700",
};

export const sampleFeedbackTones: Record<SampleFeedbackResult, string> = {
  pending: "bg-stone-200/72 text-stone-700",
  interested: "bg-emerald-50/82 text-emerald-800",
  comparing: "bg-blue-50/82 text-blue-800",
  rejected: "bg-rose-50/82 text-rose-800",
  ordered: "bg-violet-50/82 text-violet-800",
};

export function sampleStatusLabel(status: string) {
  return sampleRequestStatusLabels[status as SampleRequestStatus] ?? status;
}

export function sampleFeedbackLabel(result: string | null) {
  if (!result) return "待反馈";
  return sampleFeedbackResultLabels[result as SampleFeedbackResult] ?? result;
}

// The pipeline is linear: each status exposes the next step(s) a user may take.
export const sampleStatusTransitions: Record<SampleRequestStatus, SampleRequestStatus[]> = {
  preparing: ["shipped", "closed"],
  shipped: ["delivered", "returned", "closed"],
  delivered: ["returned", "closed"],
  returned: ["closed"],
  closed: [],
};

export function isSampleOverdue(request: Pick<SampleRequestRecord, "expectedReturnAt" | "returnedAt" | "status">) {
  if (!request.expectedReturnAt || request.returnedAt) return false;
  if (request.status === "closed") return false;
  return new Date(request.expectedReturnAt).getTime() < Date.now();
}

export function countSampleFeedback(request: Pick<SampleRequestDetailRecord, "items">) {
  return request.items.filter((item) => item.feedbackResult && item.feedbackResult !== "pending").length;
}
