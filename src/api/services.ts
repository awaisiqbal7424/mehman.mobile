import api, { setToken } from './client';
import type {
  Conversation, Coupon, CouponValidation, CustomTrip, HostBooking, HostDashboard, HostFinancials,
  LoginRequest, LoginResponse, Message, PackageAvailability, PackageBooking, PackagePricingOption,
  Paged, Payment, PriceEstimate, ProviderCategory, ProviderPackage, ProviderType, RegisterRequest,
  Review, SeasonalPricing, ServiceProvider, TripActivity, TripDestination, User, Wishlist,
} from '../types';

/* ── auth ─────────────────────────────────────────────────────────────────── */

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { data: res } = await api.post<LoginResponse>('/api/authenticate', data);
    if (res.id_token) await setToken(res.id_token);
    return res;
  },
  async register(data: RegisterRequest): Promise<User> {
    const { data: res } = await api.post<User>('/api/register', data);
    return res;
  },
  async activate(key: string): Promise<void> {
    await api.get('/api/activate', { params: { key } });
  },
  async getAccount(): Promise<User> {
    const { data } = await api.get<User>('/api/account');
    return data;
  },
  async updateAccount(payload: Partial<User>): Promise<User> {
    const { data } = await api.post<User>('/api/account', payload);
    return data;
  },
  /** The reset endpoint takes the address as a plain-text body, not JSON. */
  async requestPasswordReset(email: string): Promise<void> {
    await api.post('/api/account/reset-password/init', email, {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/api/account/change-password', { currentPassword, newPassword });
  },
};

/* ── catalogue ────────────────────────────────────────────────────────────── */

export interface PackageSearchParams {
  q?: string; type?: string; minPrice?: number; maxPrice?: number;
  difficulty?: string; city?: string; sort?: string; topRated?: boolean;
  page?: number; size?: number;
}

export const packageApi = {
  async getAll(params?: { providerId?: string; type?: string; isActive?: boolean }): Promise<ProviderPackage[]> {
    const { data } = await api.get<ProviderPackage[]>('/api/provider-packages', { params });
    return data;
  },
  async getById(id: string): Promise<ProviderPackage> {
    const { data } = await api.get<ProviderPackage>(`/api/provider-packages/${id}`);
    return data;
  },
  async search(params?: PackageSearchParams): Promise<Paged<ProviderPackage>> {
    const { data } = await api.get<Paged<ProviderPackage>>('/api/provider-packages/public-search', { params });
    return data;
  },
  async create(payload: Partial<ProviderPackage>): Promise<ProviderPackage> {
    const { data } = await api.post<ProviderPackage>('/api/provider-packages', payload);
    return data;
  },
  async update(id: string, payload: Partial<ProviderPackage>): Promise<ProviderPackage> {
    const { data } = await api.put<ProviderPackage>(`/api/provider-packages/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/provider-packages/${id}`);
  },
};

export const providerApi = {
  async getAll(params?: { typeId?: string; categoryId?: string; city?: string; isApproved?: boolean; size?: number }): Promise<ServiceProvider[]> {
    const { data } = await api.get<ServiceProvider[]>('/api/service-providers', { params });
    return data;
  },
  async getById(id: string): Promise<ServiceProvider> {
    const { data } = await api.get<ServiceProvider>(`/api/service-providers/${id}`);
    return data;
  },
  async getTourOperators(): Promise<ServiceProvider[]> {
    const { data } = await api.get<ServiceProvider[]>('/api/service-providers/tour-operators');
    return data;
  },
  async getTypes(): Promise<ProviderType[]> {
    const { data } = await api.get<ProviderType[]>('/api/provider-types');
    return data;
  },
  async getCategories(typeId?: string): Promise<ProviderCategory[]> {
    const { data } = await api.get<ProviderCategory[]>('/api/provider-categories', { params: { typeId } });
    return data;
  },
  /** Registers a new host business. Returns the pending provider record. */
  async register(payload: Partial<ServiceProvider>): Promise<ServiceProvider> {
    const { data } = await api.post<ServiceProvider>('/api/service-providers', payload);
    return data;
  },
  async update(id: string, payload: Partial<ServiceProvider>): Promise<ServiceProvider> {
    const { data } = await api.put<ServiceProvider>(`/api/service-providers/${id}`, payload);
    return data;
  },
};

/* ── availability & pricing ───────────────────────────────────────────────── */

export const availabilityApi = {
  async forPackage(packageId: string): Promise<PackageAvailability[]> {
    const { data } = await api.get<PackageAvailability[]>(`/api/availability/package/${packageId}`);
    return data;
  },
  async tourSlots(packageId: string): Promise<PackageAvailability[]> {
    const { data } = await api.get<PackageAvailability[]>(`/api/availability/package/${packageId}/tour-slots`);
    return data;
  },
  async calendar(packageId: string, month: number, year: number): Promise<PackageAvailability[]> {
    const { data } = await api.get<PackageAvailability[]>(`/api/availability/package/${packageId}/calendar`, {
      params: { month, year },
    });
    return data;
  },
  async check(packageId: string, checkIn: string, checkOut: string): Promise<boolean> {
    const { data } = await api.post<boolean>('/api/availability/check', { packageId, checkIn, checkOut });
    return data;
  },

  /* host-side writes */
  async create(payload: Partial<PackageAvailability>): Promise<PackageAvailability> {
    const { data } = await api.post<PackageAvailability>('/api/availability', payload);
    return data;
  },
  async update(id: string, payload: Partial<PackageAvailability>): Promise<PackageAvailability> {
    const { data } = await api.put<PackageAvailability>(`/api/availability/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/availability/${id}`);
  },
  async block(payload: { packageId: string; startDate: string; endDate: string; notes?: string }): Promise<void> {
    await api.post('/api/availability/block', payload);
  },
  async open(payload: { packageId: string; startDate: string; endDate: string }): Promise<void> {
    await api.post('/api/availability/open', payload);
  },
};

export const seasonalPricingApi = {
  async forPackage(packageId: string): Promise<SeasonalPricing[]> {
    const { data } = await api.get<SeasonalPricing[]>(`/api/seasonal-pricing/package/${packageId}`);
    return data;
  },
  async create(payload: Partial<SeasonalPricing>): Promise<SeasonalPricing> {
    const { data } = await api.post<SeasonalPricing>('/api/seasonal-pricing', payload);
    return data;
  },
  async update(id: string, payload: Partial<SeasonalPricing>): Promise<SeasonalPricing> {
    const { data } = await api.put<SeasonalPricing>(`/api/seasonal-pricing/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/seasonal-pricing/${id}`);
  },
};

export const pricingOptionApi = {
  async forPackage(packageId: string): Promise<PackagePricingOption[]> {
    const { data } = await api.get<PackagePricingOption[]>(`/api/package-pricing-options/package/${packageId}`);
    return data;
  },
  async create(payload: Partial<PackagePricingOption>): Promise<PackagePricingOption> {
    const { data } = await api.post<PackagePricingOption>('/api/package-pricing-options', payload);
    return data;
  },
  async update(id: string, payload: Partial<PackagePricingOption>): Promise<PackagePricingOption> {
    const { data } = await api.put<PackagePricingOption>(`/api/package-pricing-options/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/package-pricing-options/${id}`);
  },
};

export const couponApi = {
  async forProvider(providerId: string): Promise<Coupon[]> {
    const { data } = await api.get<Coupon[]>(`/api/coupons/provider/${providerId}`);
    return data;
  },
  async create(payload: Partial<Coupon>): Promise<Coupon> {
    const { data } = await api.post<Coupon>('/api/coupons', payload);
    return data;
  },
  async update(id: string, payload: Partial<Coupon>): Promise<Coupon> {
    const { data } = await api.put<Coupon>(`/api/coupons/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/coupons/${id}`);
  },
  /** Public: a guest redeeming a code at checkout. */
  async validate(payload: { code: string; packageId: string; providerId?: string; amount: number }): Promise<CouponValidation> {
    const { data } = await api.post<CouponValidation>('/api/coupons/validate', payload);
    return data;
  },
};

/* ── bookings ─────────────────────────────────────────────────────────────── */

export const bookingApi = {
  async mine(userId: string): Promise<PackageBooking[]> {
    const { data } = await api.get<PackageBooking[]>('/api/package-bookings/my', { params: { userId } });
    return data;
  },
  async getById(id: string): Promise<PackageBooking> {
    const { data } = await api.get<PackageBooking>(`/api/package-bookings/${id}`);
    return data;
  },
  async createTour(payload: Partial<PackageBooking>): Promise<PackageBooking> {
    const { data } = await api.post<PackageBooking>('/api/package-bookings/tour', payload);
    return data;
  },
  async createStay(payload: Partial<PackageBooking>): Promise<PackageBooking> {
    const { data } = await api.post<PackageBooking>('/api/package-bookings/stay', payload);
    return data;
  },
  async setStatus(id: string, status: string): Promise<boolean> {
    const { data } = await api.put<boolean>(`/api/package-bookings/${id}/status`, { status });
    return data;
  },
  async cancel(id: string, reason: string): Promise<boolean> {
    const { data } = await api.put<boolean>(`/api/package-bookings/${id}/cancel`, { reason });
    return data;
  },
};

/* ── custom trips ─────────────────────────────────────────────────────────── */

export const customTripApi = {
  async createDraft(payload: Partial<CustomTrip>): Promise<CustomTrip> {
    const { data } = await api.post<CustomTrip>('/api/custom-trips', payload);
    return data;
  },
  async updateDraft(id: string, payload: Partial<CustomTrip>): Promise<CustomTrip> {
    const { data } = await api.put<CustomTrip>(`/api/custom-trips/${id}`, payload);
    return data;
  },
  async submit(id: string): Promise<CustomTrip> {
    const { data } = await api.put<CustomTrip>(`/api/custom-trips/${id}/submit`);
    return data;
  },
  async mine(guestId: string): Promise<CustomTrip[]> {
    const { data } = await api.get<CustomTrip[]>('/api/custom-trips/my', { params: { guestId } });
    return data;
  },
  async getById(id: string): Promise<CustomTrip> {
    const { data } = await api.get<CustomTrip>(`/api/custom-trips/${id}`);
    return data;
  },
  async acceptQuote(id: string): Promise<PackageBooking> {
    const { data } = await api.put<PackageBooking>(`/api/custom-trips/${id}/accept-quote`);
    return data;
  },
  async rejectQuote(id: string, reason: string): Promise<CustomTrip> {
    const { data } = await api.put<CustomTrip>(`/api/custom-trips/${id}/reject-quote`, { reason });
    return data;
  },
  async cancel(id: string, reason: string): Promise<void> {
    await api.delete(`/api/custom-trips/${id}`, { data: { reason } });
  },
  /** Host side: send a price back on a submitted request. */
  async sendQuote(
    id: string,
    payload: { quotedPrice: number; quoteNotes?: string; quoteDetailsJson?: string },
  ): Promise<CustomTrip> {
    const { data } = await api.put<CustomTrip>(`/api/custom-trips/${id}/quote`, payload);
    return data;
  },
};

export const tripBuilderApi = {
  async destinations(isPopular?: boolean): Promise<TripDestination[]> {
    const { data } = await api.get<TripDestination[]>('/api/trip-builder/destinations', { params: { isPopular } });
    return data;
  },
  async activities(): Promise<TripActivity[]> {
    const { data } = await api.get<TripActivity[]>('/api/trip-builder/activities');
    return data;
  },
  async tourOperators(): Promise<ServiceProvider[]> {
    const { data } = await api.get<ServiceProvider[]>('/api/trip-builder/tour-operators');
    return data;
  },
  async estimate(params: {
    durationDays: number; guestCount: number; accommodationPreference: string;
    transportPreference: string; mealPreference: string; destinationCount: number;
  }): Promise<PriceEstimate> {
    const { data } = await api.get<PriceEstimate>('/api/trip-builder/estimate', { params });
    return data;
  },
};

/* ── messaging ────────────────────────────────────────────────────────────── */

export const messageApi = {
  async conversations(userId: string): Promise<Conversation[]> {
    const { data } = await api.get<Conversation[]>('/api/messages/conversations', { params: { userId } });
    return data;
  },
  async hostConversations(): Promise<Conversation[]> {
    const { data } = await api.get<Conversation[]>('/api/provider/conversations');
    return data;
  },
  async thread(conversationId: string): Promise<Message[]> {
    const { data } = await api.get<Message[]>(`/api/messages/conversations/${conversationId}`);
    return data;
  },
  async send(payload: Partial<Message>): Promise<Message> {
    const { data } = await api.post<Message>('/api/messages', payload);
    return data;
  },
  async markRead(conversationId: string, userId: string): Promise<boolean> {
    const { data } = await api.put<boolean>(`/api/messages/conversations/${conversationId}/read`, { userId });
    return data;
  },
  async unreadCount(): Promise<{ total: number; byConversation?: Record<string, number> }> {
    const { data } = await api.get('/api/messages/unread-count');
    return data;
  },
  async openWithProvider(guestId: string, hostId: string, providerId: string): Promise<Conversation> {
    const { data } = await api.get<Conversation>(`/api/messages/contact/${providerId}`, {
      params: { guestId, hostId },
    });
    return data;
  },
  /**
   * Deletes a conversation server-side where that is supported. The endpoint
   * may not exist yet, so a 404/405 reports `notImplemented` — the caller
   * still hides the thread locally either way (see `useHiddenChats`), it just
   * cannot promise the other side stops seeing it too.
   */
  async removeConversation(conversationId: string): Promise<{ ok: boolean; notImplemented?: boolean }> {
    try {
      await api.delete(`/api/messages/conversations/${conversationId}`);
      return { ok: true };
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 405) return { ok: false, notImplemented: true };
      return { ok: false };
    }
  },
};

/* ── reviews, wishlist, payments ──────────────────────────────────────────── */

export const reviewApi = {
  async forProvider(providerId: string): Promise<Review[]> {
    const { data } = await api.get<Review[]>(`/api/reviews/provider/${providerId}`);
    return data;
  },
  async create(payload: Partial<Review>): Promise<Review> {
    const { data } = await api.post<Review>('/api/reviews', payload);
    return data;
  },
  async respond(id: string, hostResponse: string): Promise<Review> {
    const { data } = await api.put<Review>(`/api/reviews/${id}/host-response`, { hostResponse });
    return data;
  },
};

export const wishlistApi = {
  async mine(userId: string): Promise<Wishlist[]> {
    const { data } = await api.get<Wishlist[]>('/api/wishlist', { params: { userId } });
    return data;
  },
  async add(payload: Partial<Wishlist>): Promise<Wishlist> {
    const { data } = await api.post<Wishlist>('/api/wishlist', payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/wishlist/${id}`);
  },
};

export const paymentApi = {
  async create(payload: Partial<Payment>): Promise<Payment> {
    const { data } = await api.post<Payment>('/api/payments', payload);
    return data;
  },
  async forBooking(bookingId: string): Promise<Payment[]> {
    const { data } = await api.get<Payment[]>('/api/payments', { params: { bookingId } });
    return data;
  },
  /**
   * Attaches the guest's transfer screenshot to a payment.
   *
   * The endpoint may not exist yet, so a 404/405 reports `notImplemented`
   * rather than throwing — the screen then falls back to WhatsApp instead of
   * silently dropping the receipt.
   */
  async uploadReceipt(
    paymentId: string,
    file: { uri: string; name: string; type: string },
  ): Promise<{ ok: boolean; notImplemented?: boolean }> {
    const body = new FormData();
    // React Native's FormData takes a {uri,name,type} descriptor, not a Blob.
    body.append('receipt', file as unknown as Blob);
    try {
      await api.post(`/api/payments/${paymentId}/receipt`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { ok: true };
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 405) return { ok: false, notImplemented: true };
      return { ok: false };
    }
  },
};

export type VerificationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface VerificationState {
  status: VerificationStatus;
  rejectReason?: string;
  submittedAt?: string;
}

export type PayoutMethod = 'BANK' | 'WALLET';

export interface PayoutDetails {
  method: PayoutMethod;
  /** BANK */
  accountHolderName?: string;
  bankName?: string;
  iban?: string;
  swiftCode?: string;
  /** WALLET */
  walletProvider?: string;
  walletNumber?: string;
  walletAccountTitle?: string;
}

/**
 * Identity (CNIC) verification for the blue badge, and the account-level
 * payout method used for host earnings and any refund that has to be routed
 * back through the account rather than the original payment method.
 *
 * These endpoints may not exist on the API yet. The submit/save calls report
 * `notImplemented` on a 404/405 rather than throwing, the same way
 * `paymentApi.uploadReceipt` does — the screen can then fall back to
 * WhatsApp instead of claiming a submission succeeded.
 */
export const verificationApi = {
  async getVerification(): Promise<VerificationState> {
    const { data } = await api.get<VerificationState>('/api/account/verification');
    return data;
  },
  async submitVerification(input: {
    cnicNumber: string;
    front: { uri: string; name: string; type: string };
    back: { uri: string; name: string; type: string };
  }): Promise<{ ok: boolean; notImplemented?: boolean; data?: VerificationState }> {
    const body = new FormData();
    body.append('cnicNumber', input.cnicNumber);
    body.append('front', input.front as unknown as Blob);
    body.append('back', input.back as unknown as Blob);
    try {
      const { data } = await api.post<VerificationState>('/api/account/verification', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { ok: true, data };
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 405) return { ok: false, notImplemented: true };
      return { ok: false };
    }
  },
  async getPayoutDetails(): Promise<PayoutDetails | null> {
    const { data } = await api.get<PayoutDetails | null>('/api/account/payout-details');
    return data;
  },
  async savePayoutDetails(payload: PayoutDetails): Promise<{ ok: boolean; notImplemented?: boolean }> {
    try {
      await api.post('/api/account/payout-details', payload);
      return { ok: true };
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 405) return { ok: false, notImplemented: true };
      return { ok: false };
    }
  },
};

/* ── host panel ───────────────────────────────────────────────────────────── */

export const hostApi = {
  /** Every provider business owned by the signed-in account. */
  async myProviders(): Promise<ServiceProvider[]> {
    const { data } = await api.get<ServiceProvider[]>('/api/provider/my');
    return data;
  },
  async dashboard(): Promise<HostDashboard> {
    const { data } = await api.get<HostDashboard>('/api/provider/dashboard');
    return data;
  },
  async financials(): Promise<HostFinancials> {
    const { data } = await api.get<HostFinancials>('/api/provider/financials');
    return data;
  },
  async bookings(params?: Record<string, string | number | undefined>): Promise<Paged<HostBooking>> {
    const { data } = await api.get<Paged<HostBooking>>('/api/provider/bookings', { params });
    return data;
  },
};
