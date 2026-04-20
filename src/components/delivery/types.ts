import type {
  DeliveryAssignmentStatus,
  DeliveryCashStatus,
  OrderStatus,
} from "@prisma/client";

export type RiderPick = {
  userId: string;
  name: string;
  email: string;
};

export type DeliveryAssignmentSummary = {
  id: string;
  status: DeliveryAssignmentStatus;
  riderId: string;
  riderName: string;
  collectedCashCents: number;
  assignedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  returnedAt: string | null;
  returnReason: string | null;
  cashSubmissionId: string | null;
};

export type DeliveryOrderRow = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  totalCents: number;
  createdAt: string;
  assignment: DeliveryAssignmentSummary | null;
};

export type PendingSubmissionRow = {
  id: string;
  riderName: string;
  totalCents: number;
  count: number;
  submittedAt: string;
  notes: string | null;
  orders: {
    orderNumber: number;
    customerName: string | null;
    collectedCashCents: number;
  }[];
};

export type RecentSubmissionRow = {
  id: string;
  riderName: string;
  totalCents: number;
  status: DeliveryCashStatus;
  reconciledAt: string | null;
  reconcileNotes: string | null;
};
