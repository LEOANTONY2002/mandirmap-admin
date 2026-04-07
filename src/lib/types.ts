export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string | null;
};

export type DashboardData = {
  stats: Record<string, number>;
  categories: Array<{ category: string; _count: { _all: number } }>;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type OptionBundle = {
  deities: Array<{ id: number; name: string }>;
  amenities: Array<{ id: number; title: string }>;
  locations: Array<{ id: string; name: string; category: string }>;
  categories: string[];
};

export type Deity = {
  id: number;
  name: string;
  nameMl?: string | null;
  photoUrl?: string | null;
};

export type Amenity = {
  id: number;
  title: string;
  image?: string | null;
};

export type Festival = {
  id: string;
  name: string;
  nameMl?: string | null;
  description?: string | null;
  descriptionMl?: string | null;
  startDate: string;
  endDate: string;
  locationId: string;
  deityId?: number | null;
  photoUrl?: string | null;
  location?: { id: string; name: string };
  deity?: { id: number; name: string } | null;
};

export type Astrologer = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  experienceYears: number;
  languages: string[];
  hourlyRate: string;
  bio?: string | null;
  rating: number;
  totalRatings: number;
  isVerified: boolean;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  photoUrls: string[];
  latitude: number;
  longitude: number;
  district?: string | null;
  state?: string | null;
};

export type UserRow = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string | null;
  language: string;
  district?: string | null;
  state?: string | null;
  createdAt: string;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
};

export type LocationRecord = {
  id: string;
  name: string;
  nameMl?: string | null;
  category: string;
  description?: string | null;
  descriptionMl?: string | null;
  addressText: string;
  addressTextMl?: string | null;
  latitude: number;
  longitude: number;
  district?: string | null;
  districtMl?: string | null;
  state?: string | null;
  stateMl?: string | null;
  temple?: {
    history?: string | null;
    historyMl?: string | null;
    openTime?: string | null;
    closeTime?: string | null;
    vazhipaduData?: unknown;
    deities?: Array<{ deityId: number; deity: { id: number; name: string } }>;
  } | null;
  hotel?: {
    pricePerDay: string;
    contactPhone?: string | null;
    whatsapp?: string | null;
    amenities?: Array<{ amenityId: number; amenity: { id: number; title: string } }>;
  } | null;
  restaurant?: {
    isPureVeg: boolean;
    menuItems?: Array<{
      id?: string;
      name: string;
      image?: string | null;
      price: string;
    }>;
  } | null;
  media?: Array<{
    id?: string;
    url: string;
    thumbnailUrl?: string | null;
    type: 'IMAGE' | 'VIDEO';
  }>;
};
