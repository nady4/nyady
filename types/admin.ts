/**
 * Shared types for the admin dashboard. Plain types only — "use server"
 * modules can't export non-async values, so server actions import these.
 */

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

export type ProductActionKind =
  | "activate"
  | "deactivate"
  | "archive";

/** Payload sent by the admin product form to create/update a product. */
export interface ProductInput {
  name: string;
  description: string | null;
  price: number;
  /** Internal purchase cost (admin-only); feeds profitability reports. */
  purchasePrice: number;
  category: string;
  code: string | null;
  purchaseName: string | null;
  available: boolean;
  sizes: string[];
  colors: string[];
  tacoOptions: string[];
  /** Cover image URL (shown on cards, catalog and carousel). */
  photo: string;
  /** Per-color image lists: { "Negro": ["https://…"], … }. */
  photos: Record<string, string[]>;
}

/** Row shape handed from the products server page to the client table. */
export interface AdminProductRow {
  id: string;
  name: string;
  photo: string;
  price: number;
  category: string;
  code: string | null;
  purchaseName: string | null;
  available: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  orderItems: number;
  carts: number;
  wishLists: number;
}

export interface AdminCategoryRow {
  category: string;
  active: number;
  archived: number;
}

/** Data returned by the products list server page for the filter bar. */
export interface AdminProductsFilters {
  q: string;
  category: string;
  /** "available" | "unavailable" | "all" — defaults to "available". */
  availability: string;
  archived: boolean;
  sort: string;
  page: number;
  perPage: number;
  categories: string[];
}

export interface AdminOrderRow {
  id: string;
  status: string;
  total: number;
  createdAt: Date;
  archivedAt: Date | null;
  source: string;
  itemsCount: number;
  couponCode: string | null;
  shipmentId: string | null;
  dispatchedAt: Date | null;
  shipmentStatus: string | null;
  user: { username: string; email: string };
}

export interface AdminOrderItemView {
  id: string;
  quantity: number;
  selectedColor: string | null;
  selectedSize: string | null;
  selectedTacoOption: string | null;
  unitPrice: number | null;
  productName: string | null;
  productPhoto: string | null;
  product: { id: string; name: string; photo: string; price: number } | null;
}

export interface AdminOrderUserView {
  id: string;
  username: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
}

export interface AdminOrderDetailView {
  id: string;
  status: string;
  total: number;
  source: string;
  createdAt: Date;
  archivedAt: Date | null;
  notes: string | null;
  recipientName: string | null;
  recipientDocument: string | null;
  recipientPhone: string | null;
  couponCode: string | null;
  discountAmount: number;
  shippingCost: number;
  shippingService: string | null;
  shippingLogistic: string | null;
  shipmentId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: string | null;
  user: AdminOrderUserView;
  items: AdminOrderItemView[];
  trackingEvents: {
    occurred_at: string;
    status: {
      code: string;
      name: string;
      visible_name: string | null;
    };
  }[];
  liveStatus: string | null;
  userUsername: string;
}

/** One item line while creating a manual order. */
export interface ManualOrderItemInput {
  productId: string;
  quantity: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
  selectedTacoOption?: string | null;
}

export interface ManualOrderInput {
  userId: string;
  status: "pending" | "approved";
  shippingCost: number;
  couponCode: string | null;
  notes: string | null;
  recipientName: string | null;
  recipientDocument: string | null;
  recipientPhone: string | null;
  items: ManualOrderItemInput[];
}

/** Editable order data (recipient + internal notes + manual tracking). */
export interface OrderDetailsInput {
  recipientName: string | null;
  recipientDocument: string | null;
  recipientPhone: string | null;
  notes: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: string | null;
}

export interface OrderItemEditInput {
  productId: string;
  quantity: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
  selectedTacoOption?: string | null;
}

/** Minimal product data for variant pickers in admin forms. */
export interface AdminProductOption {
  id: string;
  name: string;
  price: number;
  photo: string;
  colors: string[];
  sizes: string[];
  tacoOptions: string[];
}

export interface AdminCouponRow {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  onePerUser: boolean;
  createdAt: Date;
}

export interface AdminCouponInput {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  onePerUser: boolean;
  usageLimit: number | null;
  /** ISO date string (YYYY-MM-DD) or null for no expiry. */
  expiresAt: string | null;
}

export interface AdminUserOption {
  id: string;
  username: string;
  email: string;
}

export interface AdminShipmentRow {
  orderId: string;
  orderStatus: string;
  createdAt: Date;
  total: number;
  shipmentId: string;
  shipmentStatus: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  liveStatus: string | null;
  userName: string;
  userEmail: string;
  destination: string | null;
  shippingService: string | null;
  shippingLogistic: string | null;
  shippingCost: number | null;
}

export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  archivedAt: Date | null;
  emailVerified: Date | null;
  addressSummary: string | null;
  ordersCount: number;
}

export interface AdminUserDetailView {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  archivedAt: Date | null;
  emailVerified: Date | null;
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  counts: { orders: number; carts: number; wishLists: number };
  orders: {
    id: string;
    status: string;
    total: number;
    createdAt: Date;
    couponCode: string | null;
    shipmentId: string | null;
  }[];
}

export interface AdminUserCreateInput {
  username: string;
  email: string;
  password: string;
  verified: boolean;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

export interface AdminUserEditInput {
  username: string;
  email: string;
}

// --- Marketing (social content library) --------------------------------------

export type MarketingChannel = "facebook" | "instagram" | "whatsapp";

/** Row shape handed from the marketing server page to PostsAdmin. */
export interface MarketingPostRow {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  channels: string[];
  media: string[];
  productId: string | null;
  productName: string | null;
  productSlug: string | null;
  campaign: string | null;
  status: string;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fbPostId: string | null;
  fbPermalink: string | null;
  igMediaId: string | null;
  igPermalink: string | null;
  publishedAt: Date | null;
  lastError: string | null;
}

/** Create/update payload for a SocialPost. */
export interface MarketingPostInput {
  title: string;
  body: string;
  hashtags: string[];
  channels: string[];
  media: string[];
  productId: string | null;
  campaign: string | null;
  status: "draft" | "ready";
  scheduledAt: string | null;
}

export interface MarketingTemplateRow {
  id: string;
  name: string;
  body: string;
  hashtags: string[];
  updatedAt: Date;
}

export interface MarketingTemplateInput {
  name: string;
  body: string;
  hashtags: string[];
}

export interface MarketingAssetRow {
  id: string;
  url: string;
  productId: string | null;
  productName: string | null;
  tag: string | null;
  createdAt: Date;
}

/** Product option for the composer's product picker (+ media gallery). */
export interface MarketingProductOption {
  id: string;
  name: string;
  slug: string;
  price: number;
  category: string;
  photo: string;
  /** All image URLs (cover + per-color buckets flattened) for quick reuse. */
  photoUrls: string[];
  colors: string[];
  sizes: string[];
  description: string | null;
}

export interface MarketingSettingsState {
  brandVoice: string | null;
  defaultHashtags: string[];
  instagramHandle: string | null;
  whatsappPhone: string | null;
}

/** Shape passed from marketing pages to the connection + composer clients. */
export interface MetaConnectionState {
  /** META_APP_ID/SECRET present in the environment. */
  configured: boolean;
  facebook: { connected: boolean; pageName: string | null };
  instagram: { connected: boolean; username: string | null };
}
