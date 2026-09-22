export const sampleRequestStatuses = ["preparing", "shipped", "delivered", "returned", "closed"] as const;
export type SampleRequestStatus = (typeof sampleRequestStatuses)[number];

export const sampleFeedbackResults = ["pending", "interested", "comparing", "rejected", "ordered"] as const;
export type SampleFeedbackResult = (typeof sampleFeedbackResults)[number];

export const sampleRequestStatusLabels: Record<SampleRequestStatus, string> = {
  preparing: "待寄出",
  shipped: "已寄出",
  delivered: "客户已签收",
  returned: "已退回",
  closed: "已结束",
};

export const sampleFeedbackResultLabels: Record<SampleFeedbackResult, string> = {
  pending: "待反馈",
  interested: "有意向",
  comparing: "对比中",
  rejected: "未选中",
  ordered: "已下单",
};

export const sampleRequestStatusOptions = sampleRequestStatuses.map((value) => ({
  value,
  label: sampleRequestStatusLabels[value],
}));

export const sampleFeedbackResultOptions = sampleFeedbackResults.map((value) => ({
  value,
  label: sampleFeedbackResultLabels[value],
}));
