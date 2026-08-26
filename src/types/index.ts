export interface User {
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  imageUrl?: string;
  activated: boolean;
  langKey: string;
  roles?: string[];
  authorities?: string[];
  isUser?: boolean;
  isProvider?: boolean;
  createdDate: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  id_token: string;
}

export interface RegisterRequest {
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  langKey: string;
  mobileNumber?: string;
}

export interface ServiceProvider {
  id: string;
  providerOwnerId?: string;
  ownerName?: string;
  name?: string;
  description?: string;
  logoUrl?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  addressAr?: string;
  latitude?: number;
  longitude?: number;
  isApproved?: boolean;
  isReject?: boolean;
  isPending?: boolean;
  providerTypeId?: string;
  providerType?: ProviderType;
  providerCategoryId?: string;
  providerCategory?: ProviderCategory;
  rating?: number;
  operatingHours?: string;
  country?: string;
  city?: string;
  streetAddress?: string;
  state?: string;
  zipCode?: string;
  district?: string;
  licenseStatus?: boolean;
  adminPercentage?: number;
  swiftCode?: string;
  iban?: string;
  bankName?: string;
  accountHolderName?: string;
  openTime?: string;
  closeTime?: string;
  videoUrl?: string;
  rejectReason?: string;
  requestNewChangeEmail?: boolean;
  newEmail?: string;
  requestChangeEmailApproved?: boolean;
  isCustomTripEligible?: boolean;
  isTourOperator?: boolean;
  licenseNumber?: string;
  subImagesJson?: string;
  socialMediaLinksJson?: string;
  openDaysJson?: string;
  closeDaysJson?: string;
  providerCertificatesJson?: string;
  tagsJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProviderType {
  id: string;
  typeName: string;
  slug: string;
  status?: boolean;
  imageUrl?: string;
  description?: string;
  sortOrder?: number;
}

export interface ProviderCategory {
  id: string;
  name: string;
  typeId: string;
  status?: string;
  imageUrl?: string;
  providerCount?: number;
  description?: string;
  sortOrder?: number;
}

export interface ProviderPackage {
  id: string;
  providerOwnerId?: string;
  providerId?: string;
  provider?: ServiceProvider;
  name?: string;
  description?: string;
  packageType?: string; // TOUR | STAY
  price?: number;
  durationDays?: number;
  durationNights?: number;
  maxGuests?: number;
  minGuests?: number;
  itineraryJson?: string;
  meetingPoint?: string;
  startLocation?: string;
  endLocation?: string;
  difficultyLevel?: string;
  tourHighlightsJson?: string;
  pricePerNight?: number;
  bedrooms?: number;
  bathrooms?: number;
  maxOccupancy?: number;
  propertyType?: string;
  amenitiesJson?: string;
  currency?: string;
  isActive?: boolean;
  isInstantBook?: boolean;
  serviceFee?: number;
  cancellationPolicy?: string;
  packageIncludesJson?: string;
  packageExcludesJson?: string;
  imagesJson?: string;
  thumbImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageBooking {
  id: string;
  providerOwnerId?: string;
  userId?: string;
  user?: User;
  packageId?: string;
  package?: ProviderPackage;
  bookingType?: string; // TOUR | STAY | CUSTOM_TRIP
  name?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  status?: string; // PENDING | CONFIRMED | CANCELLED | COMPLETED | NO_SHOW
  departureDate?: string;
  availabilityId?: string;
  availability?: PackageAvailability;
  checkIn?: string;
  checkOut?: string;
  nightsCount?: number;
  guestCount?: number;
  baseAmount?: number;
  serviceFee?: number;
  totalAmount?: number;
  paidAmount?: number;
  pricingOptionId?: string;
  couponCode?: string;
  discountAmount?: number;
  specialRequests?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  customTripId?: string;
  customTrip?: CustomTrip;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageAvailability {
  id: string;
  packageId?: string;
  package?: ProviderPackage;
  providerId?: string;
  provider?: ServiceProvider;
  availabilityType?: string; // TOUR_DEPARTURE | STAY_BLOCKED | STAY_AVAILABLE
  date: string;
  endDate?: string;
  totalSpots?: number;
  bookedSpots?: number;
  availableSpots?: number;
  isAvailable?: boolean;
  priceOverride?: number;
  notes?: string;
}

export interface SeasonalPricing {
  id: string;
  packageId?: string;
  name?: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  minNights?: number;
  pricingType?: string; // FIXED | PERCENTAGE_INCREASE | PERCENTAGE_DECREASE
  percentageChange?: number;
  isActive: boolean;
}

/**
 * A named price variant a provider can offer alongside their base price —
 * "Couple Discount", "Solo Female Traveler", "Early Bird", etc. A guest picks
 * one (or the base price) when booking; whichever is picked becomes the unit
 * price the quote is built from.
 */
export interface PackagePricingOption {
  id: string;
  packageId?: string;
  label: string;
  pricingType?: string; // FIXED | PERCENTAGE_INCREASE | PERCENTAGE_DECREASE
  price?: number; // absolute unit price, when pricingType === 'FIXED'
  percentageChange?: number; // applied to the base price, when PERCENTAGE_INCREASE/DECREASE
  description?: string;
  isActive: boolean;
}

/** A promo code a provider issues, redeemable against their own listings. */
export interface Coupon {
  id: string;
  providerId?: string;
  packageId?: string; // scope to one listing; omitted applies to any of the provider's listings
  code: string;
  discountType?: string; // PERCENTAGE | FIXED
  discountValue: number;
  startDate?: string;
  endDate?: string;
  maxUses?: number;
  usedCount?: number;
  minBookingAmount?: number;
  isActive: boolean;
  createdAt?: string;
}

export interface CouponValidation {
  valid: boolean;
  message?: string;
  discountAmount?: number;
  coupon?: Coupon;
}

export interface CustomTrip {
  id: string;
  guestId?: string;
  guest?: User;
  title?: string;
  tripType?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  guestCount?: number;
  adultCount?: number;
  childCount?: number;
  originCity?: string;
  destinationsJson?: string;
  activitiesJson?: string;
  accommodationPreference?: string;
  transportPreference?: string;
  mealPreference?: string;
  specialRequirements?: string;
  budget?: number;
  assignedOperatorId?: string;
  assignedOperator?: ServiceProvider;
  status?: string; // DRAFT | SUBMITTED | QUOTE_SENT | CONFIRMED | ONGOING | COMPLETED | CANCELLED
  quotedPrice?: number;
  quoteDetailsJson?: string;
  quoteNotes?: string;
  quotedAt?: string;
  confirmedAt?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TripDestination {
  id: string;
  name: string;
  region: string;
  province?: string;
  description?: string;
  imageUrl?: string;
  imagesJson?: string;
  latitude?: number;
  longitude?: number;
  isPopular?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  activitiesJson?: string;
  bestTimeToVisit?: string;
  tags?: string;
}

export interface TripActivity {
  id: string;
  name: string;
  category: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface Review {
  id: string;
  reviewerId?: string;
  reviewer?: User;
  providerId?: string;
  provider?: ServiceProvider;
  packageId?: string;
  bookingId?: string;
  customerFullName?: string;
  rating?: number;
  cleanlinessRating?: number;
  valueRating?: number;
  locationRating?: number;
  communicationRating?: number;
  comment?: string;
  commentAr?: string;
  hostResponse?: string;
  hostResponseDate?: string;
  isApproved?: boolean;
  reviewDate?: string;
}

export interface Payment {
  id: string;
  userId?: string;
  bookingId?: string;
  packageId?: string;
  externalPaymentId?: string;
  amount?: number;
  status?: string;
  transactionId?: string;
  paymentMethod?: string;
  createdAt?: string;
  currency?: string;
  refundAmount?: number;
  refundId?: string;
  refundedAt?: string;
  refundReason?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  titleEn?: string;
  titleAr?: string;
  bodyEn?: string;
  bodyAr?: string;
  isRead?: boolean;
  expoKey?: string;
  type?: string;
  referenceId?: string;
  createdAt?: string;
}

export interface Wishlist {
  id: string;
  userId?: string;
  user?: User;
  providerId?: string;
  provider?: ServiceProvider;
  packageId?: string;
  /** Attached by the API for saved packages; absent if the package was deleted. */
  package?: ProviderPackage;
  savedAt?: string;
}

export interface Conversation {
  id: string;
  guestId?: string;
  guest?: User;
  hostId?: string;
  providerId?: string;
  bookingId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  conversationId?: string;
  conversation?: Conversation;
  senderId?: string;
  sender?: User;
  content?: string;
  isRead?: boolean;
  sentAt?: string;
}

export interface PackageInclude {
  id: string;
  name: string;
  icon?: string;
  category?: string;
}

export interface DashboardStats {
  totalProviders: number;
  approvedProviders: number;
  pendingProviders: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalReviews: number;
  averageRating: number;
}

export interface HostDashboardStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalPackages: number;
  activePackages: number;
  totalReviews: number;
  averageRating: number;
  totalRevenue: number;
}

export interface GuestDashboardStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  totalReviews: number;
  wishlistCount: number;
}

export interface PriceEstimate {
  perPersonPerDay: number;
  transportCost: number;
  accommodationCost: number;
  mealCost: number;
  totalPerPerson: number;
  totalForGroup: number;
  currency: string;
  estimateNote: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Host-side shapes.
 *
 * These come from the provider panel (Mehman.provider). They are additive: the
 * guest types above are shared verbatim with the traveller web app, so keeping
 * the host shapes below the line makes the two halves easy to diff.
 * ──────────────────────────────────────────────────────────────────────────── */

/** none = no provider registered · pending = awaiting review · approved = live */
export type ProviderStatus = 'none' | 'pending' | 'rejected' | 'approved';

export interface Paged<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/** A booking as the host sees it: the guest's details plus the host's cut. */
export interface HostBooking extends PackageBooking {
  packageName?: string;
  commissionPercentage?: number;
  ownerRevenue?: number;
  ownerPayoutPaid?: boolean;
  ownerPayoutPaidAt?: string;
}

export interface HostDashboard {
  bookingCounts: { pending: number; confirmed: number; completed: number; cancelled: number; total: number };
  upcoming: {
    id: string; name?: string; guestName?: string; bookingType?: string; status?: string;
    departureDate?: string; checkIn?: string; checkOut?: string; guestCount?: number; totalAmount?: number;
  }[];
  earningsThisMonth: number;
  recentReviews: {
    id: string; customerFullName?: string; rating?: number;
    comment?: string; reviewDate?: string; hostResponse?: string;
  }[];
  unreadMessages: number;
  activePackages: number;
  totalPackages: number;
}

export interface HostFinancials {
  ownerRevenue: number;
  ownerRevenuePaid: number;
  ownerRevenueUnpaid: number;
  payoutsPaidCount: number;
  payoutsUnpaidCount: number;
  byMonth: {
    month: string; bookings: number; value: number;
    ownerRevenue: number; adminRevenue: number; ownerRevenuePaid: number;
  }[];
}

/** Which half of the app the signed-in person is currently looking at. */
export type AppRole = 'guest' | 'host';
