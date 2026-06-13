import { useEffect, useMemo, useRef, useState } from 'react';
import { Country, State, City } from 'country-state-city';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker icon issue in Vite packaging
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
import {
  DeleteIcon,
  EditIcon,
  PlusIcon,
  UploadIcon,
} from '../components/AdminIcons';
import { EntityTable } from '../components/EntityTable';
import { FormField } from '../components/FormField';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { PaginationBar } from '../components/PaginationBar';
import { UploadField } from '../components/UploadField';
import { useAdminQuery } from '../hooks/useAdminQuery';
import { api } from '../lib/api';
import type {
  LocationRecord,
  OptionBundle,
  PaginatedResponse,
} from '../lib/types';
import { useAuth } from '../state/auth';

type VazhipaduItem = {
  name: string;
  price: string;
};

type MediaRow = NonNullable<LocationRecord['media']>[number];
type MenuItemRow = NonNullable<NonNullable<LocationRecord['restaurant']>['menuItems']>[number];

const defaultTemple = {
  history: '',
  historyMl: '',
  openTime: '',
  closeTime: '',
  vazhipaduData: [] as VazhipaduItem[],
  deities: [] as Array<{ deityId: number; deity: { id: number; name: string } }>,
};

const defaultHotel = {
  pricePerDay: '0',
  contactPhone: '',
  whatsapp: '',
  amenities: [] as Array<{ amenityId: number; amenity: { id: number; title: string } }>,
};

const defaultRestaurant = {
  isPureVeg: true,
  menuItems: [] as MenuItemRow[],
};

const emptyLocation: LocationRecord = {
  id: '',
  name: '',
  nameMl: '',
  category: 'TEMPLE',
  description: '',
  descriptionMl: '',
  addressText: '',
  addressTextMl: '',
  latitude: 0,
  longitude: 0,
  district: '',
  districtMl: '',
  state: '',
  stateMl: '',
  temple: defaultTemple,
  hotel: defaultHotel,
  restaurant: defaultRestaurant,
  media: [],
};

function emptyVazhipaduItem(): VazhipaduItem {
  return { name: '', price: '' };
}

function emptyMenuItem(): MenuItemRow {
  return { name: '', price: '', image: '' };
}

function emptyMediaRow(type: 'IMAGE' | 'VIDEO' = 'IMAGE'): MediaRow {
  return { type, url: '', thumbnailUrl: '' };
}

function normalizeVazhipaduData(value: unknown): VazhipaduItem[] {
  const source =
    Array.isArray(value)
      ? value
      : value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items)
        ? (value as { items: unknown[] }).items
        : [];

  return source.map((item) => {
    const record = typeof item === 'object' && item ? (item as Record<string, unknown>) : {};
    return {
      name: String(record.name ?? ''),
      price: String(record.price ?? ''),
    };
  });
}

function mapLocationToForm(location: LocationRecord): LocationRecord {
  return {
    ...location,
    temple: {
      ...defaultTemple,
      ...(location.temple ?? {}),
      vazhipaduData: normalizeVazhipaduData(location.temple?.vazhipaduData),
      deities: location.temple?.deities ?? [],
    },
    hotel: {
      ...defaultHotel,
      ...(location.hotel ?? {}),
      amenities: location.hotel?.amenities ?? [],
    },
    restaurant: {
      ...defaultRestaurant,
      ...(location.restaurant ?? {}),
      menuItems: location.restaurant?.menuItems ?? [],
    },
    media: location.media ?? [],
  };
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapEventsHandler({
  onSelectCoords,
}: {
  onSelectCoords: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelectCoords(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationsPage() {
  const { token } = useAuth();
  const { data: options } = useAdminQuery<OptionBundle>('/admin/options');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [hasMedia, setHasMedia] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LocationRecord>(emptyLocation);
  const [open, setOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('IN');
  const [selectedStateCode, setSelectedStateCode] = useState<string>('');
  const [selectedCountryName, setSelectedCountryName] = useState<string>('India');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [districtError, setDistrictError] = useState<string | null>(null);
  const [coordTab, setCoordTab] = useState<'map' | 'url' | 'manual'>('map');
  const [mapUrl, setMapUrl] = useState('');
  const [mapUrlError, setMapUrlError] = useState<string | null>(null);
  const [latError, setLatError] = useState<string | null>(null);
  const [lonError, setLonError] = useState<string | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.0314, 75.3578]);
  const [mapZoom, setMapZoom] = useState(13);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSuggestions, setMapSuggestions] = useState<Array<{
    label: string;
    lat: number;
    lon: number;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editorTab, setEditorTab] = useState<'map' | 'manual'>('map');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = deletingId !== null;
  const isSavingRef = useRef(false);

  const handleGeocodeRegion = async (country: string, state: string, district: string) => {
    if (!country) return;
    const queryParts = [district, state, country].filter(Boolean);
    const query = queryParts.join(', ');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = Number(data[0].lat);
        const lon = Number(data[0].lon);
        setMapCenter([lat, lon]);
        setMapZoom(district ? 12 : state ? 8 : 5);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  };

  const handleMapClickCoords = async (lat: number, lon: number) => {
    const preciseLat = Number(lat.toFixed(6));
    const preciseLon = Number(lon.toFixed(6));
    
    setLatInput(String(preciseLat));
    setLonInput(String(preciseLon));
    updateBase('latitude', preciseLat);
    updateBase('longitude', preciseLon);
    setLatError(null);
    setLonError(null);
    
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${preciseLat}&lon=${preciseLon}`);
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        
        if (addr.country) {
          const matchedCountry = Country.getAllCountries().find(
            (c) => c.name.toLowerCase() === addr.country.toLowerCase()
          );
          if (matchedCountry) {
            setSelectedCountryCode(matchedCountry.isoCode);
            setSelectedCountryName(matchedCountry.name);
            
            if (addr.state) {
              const states = State.getStatesOfCountry(matchedCountry.isoCode);
              const matchedState = states.find(
                (s) => s.name.toLowerCase() === addr.state.toLowerCase() ||
                       s.name.toLowerCase().includes(addr.state.toLowerCase())
              );
              if (matchedState) {
                setSelectedStateCode(matchedState.isoCode);
                updateBase('state', matchedState.name);
                
                const districtName = addr.county || addr.city || addr.town || addr.suburb || '';
                if (districtName) {
                  const cities = City.getCitiesOfState(matchedCountry.isoCode, matchedState.isoCode);
                  const matchedCity = cities.find(
                    (c) => c.name.toLowerCase() === districtName.toLowerCase() ||
                           c.name.toLowerCase().includes(districtName.toLowerCase()) ||
                           districtName.toLowerCase().includes(c.name.toLowerCase())
                  );
                  if (matchedCity) {
                    updateBase('district', matchedCity.name);
                  } else {
                    updateBase('district', districtName.replace(/\s+District$/i, ''));
                  }
                }
              }
            }
          }
        }
        
        const venueName = addr.amenity || addr.tourism || addr.shop || addr.historic || addr.artwork || '';
        if (venueName) {
          updateBase('name', venueName);
        }
        
        const formattedAddress = data.display_name || '';
        if (formattedAddress) {
          updateBase('addressText', formattedAddress);
        }
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
    
    setTimeout(() => {
      setEditorTab('manual');
    }, 600);
  };

  const handleMapSearch = async (query: string) => {
    if (!query.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = Number(data[0].lat);
        const lon = Number(data[0].lon);
        setMapCenter([lat, lon]);
        setMapZoom(16);
        handleMapClickCoords(lat, lon);
      } else {
        alert("Location not found on map.");
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleSelectSuggestion = (suggestion: { label: string; lat: number; lon: number }) => {
    setMapSearchQuery(suggestion.label);
    setShowSuggestions(false);
    
    setMapCenter([suggestion.lat, suggestion.lon]);
    setMapZoom(16);
    handleMapClickCoords(suggestion.lat, suggestion.lon);
  };

  useEffect(() => {
    if (!mapSearchQuery.trim() || mapSearchQuery.length < 3) {
      setMapSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(mapSearchQuery)}&limit=8`);
        const data = await res.json();
        if (data && data.features) {
          const suggestions = data.features.map((f: any) => {
            const name = f.properties.name || '';
            const city = f.properties.city || f.properties.town || f.properties.village || '';
            const state = f.properties.state || '';
            const country = f.properties.country || '';
            const label = [name, city, state, country].filter(Boolean).join(', ');
            return {
              label,
              lon: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1]
            };
          });
          setMapSuggestions(suggestions);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Autocomplete fetch error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [mapSearchQuery]);

  useEffect(() => {
    if (open && coordTab === 'map') {
      if (latInput && lonInput && !isNaN(Number(latInput)) && !isNaN(Number(lonInput))) {
        setMapCenter([Number(latInput), Number(lonInput)]);
        setMapZoom(15);
        return;
      }
      const delayDebounce = setTimeout(() => {
        handleGeocodeRegion(selectedCountryName, selected.state || '', selected.district || '');
      }, 500);
      return () => clearTimeout(delayDebounce);
    }
  }, [selectedCountryName, selected.state, selected.district, coordTab, open]);

  const validateLatitude = (val: string | number) => {
    const strVal = String(val).trim();
    const num = Number(strVal);
    if (strVal === '' || isNaN(num) || num < 8 || num > 38) {
      setLatError('Latitude must be a valid number between 8.0 and 38.0 (India region).');
      return false;
    }
    if (Number.isInteger(num)) {
      setLatError('Latitude must be a decimal number (not an integer) with at least 3 decimal places.');
      return false;
    }
    if (typeof val === 'string') {
      const decRegex = /^-?\d+\.\d{3,}$/;
      if (!decRegex.test(strVal)) {
        setLatError('Latitude must be a decimal number with at least 3 decimal places (e.g., 12.031).');
        return false;
      }
    }
    setLatError(null);
    return true;
  };

  const validateLongitude = (val: string | number) => {
    const strVal = String(val).trim();
    const num = Number(strVal);
    if (strVal === '' || isNaN(num) || num < 68 || num > 98) {
      setLonError('Longitude must be a valid number between 68.0 and 98.0 (India region).');
      return false;
    }
    if (Number.isInteger(num)) {
      setLonError('Longitude must be a decimal number (not an integer) with at least 3 decimal places.');
      return false;
    }
    if (typeof val === 'string') {
      const decRegex = /^-?\d+\.\d{3,}$/;
      if (!decRegex.test(strVal)) {
        setLonError('Longitude must be a decimal number with at least 3 decimal places (e.g., 75.357).');
        return false;
      }
    }
    setLonError(null);
    return true;
  };

  const parseCoordinates = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return { lat: Number(atMatch[1]), lon: Number(atMatch[2]) };
    }

    const qMatch = trimmed.match(/[?&](q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      return { lat: Number(qMatch[2]), lon: Number(qMatch[3]) };
    }

    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      if (parts.length === 2) {
        const lat = Number(parts[0].trim());
        const lon = Number(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lon };
        }
      }
    }

    return null;
  };

  const validateCountry = (name: string) => {
    if (!name.trim()) {
      setCountryError(null);
      return true;
    }
    const matched = Country.getAllCountries().some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (!matched) {
      setCountryError('Please select a valid Country from the list.');
      return false;
    }
    setCountryError(null);
    return true;
  };

  const validateState = (name: string) => {
    if (!name.trim()) {
      setStateError(null);
      return true;
    }
    const states = State.getStatesOfCountry(selectedCountryCode);
    const matched = states.some(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (!matched) {
      setStateError('Please select a valid State from the list.');
      return false;
    }
    setStateError(null);
    return true;
  };

  const validateDistrict = (name: string) => {
    if (!name.trim()) {
      setDistrictError(null);
      return true;
    }
    const cities = City.getCitiesOfState(selectedCountryCode, selectedStateCode);
    const matched = cities.some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (!matched) {
      setDistrictError('Please select a valid District/City from the list.');
      return false;
    }
    setDistrictError(null);
    return true;
  };

  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    });
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (districtFilter) params.set('district', districtFilter);
    if (stateFilter) params.set('state', stateFilter);
    if (hasMedia) params.set('hasMedia', hasMedia);
    return `/admin/locations?${params.toString()}`;
  }, [categoryFilter, districtFilter, hasMedia, page, search, stateFilter]);

  const { data, loading, error, refresh } =
    useAdminQuery<PaginatedResponse<LocationRecord>>(path, [path]);

  function updateBase<K extends keyof LocationRecord>(
    key: K,
    value: LocationRecord[K],
  ) {
    setSelected((current) => ({ ...current, [key]: value }));
  }

  function updateTemple(key: string, value: unknown) {
    setSelected((current) => ({
      ...current,
      temple: { ...defaultTemple, ...(current.temple ?? {}), [key]: value },
    }));
  }

  function updateHotel(key: string, value: unknown) {
    setSelected((current) => ({
      ...current,
      hotel: { ...defaultHotel, ...(current.hotel ?? {}), [key]: value },
    }));
  }

  function updateRestaurant(key: string, value: unknown) {
    setSelected((current) => ({
      ...current,
      restaurant: { ...defaultRestaurant, ...(current.restaurant ?? {}), [key]: value },
    }));
  }

  function updateVazhipaduItem(index: number, key: keyof VazhipaduItem, value: string) {
    const items = [...((selected.temple?.vazhipaduData as VazhipaduItem[]) ?? [])];
    items[index] = { ...items[index], [key]: value };
    updateTemple('vazhipaduData', items);
  }

  function addVazhipaduItem() {
    updateTemple('vazhipaduData', [
      ...((selected.temple?.vazhipaduData as VazhipaduItem[]) ?? []),
      emptyVazhipaduItem(),
    ]);
  }

  function removeVazhipaduItem(index: number) {
    updateTemple(
      'vazhipaduData',
      ((selected.temple?.vazhipaduData as VazhipaduItem[]) ?? []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  }

  function updateMenuItem(index: number, key: keyof MenuItemRow, value: string) {
    const items = [...(selected.restaurant?.menuItems ?? [])];
    items[index] = { ...items[index], [key]: value };
    updateRestaurant('menuItems', items);
  }

  function addMenuItem() {
    updateRestaurant('menuItems', [
      ...(selected.restaurant?.menuItems ?? []),
      emptyMenuItem(),
    ]);
  }

  function removeMenuItem(index: number) {
    updateRestaurant(
      'menuItems',
      (selected.restaurant?.menuItems ?? []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  }

  function updateMediaItem(index: number, key: keyof MediaRow, value: string) {
    const items = [...(selected.media ?? [])];
    items[index] = { ...items[index], [key]: value };
    updateBase('media', items);
  }

  function addMediaItem(type: 'IMAGE' | 'VIDEO' = 'IMAGE') {
    updateBase('media', [...(selected.media ?? []), emptyMediaRow(type)]);
  }

  function removeMediaItem(index: number) {
    updateBase(
      'media',
      (selected.media ?? []).filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function toggleTempleDeity(id: number, name: string) {
    const current = selected.temple?.deities ?? [];
    const exists = current.some((item) => item.deity.id === id);
    updateTemple(
      'deities',
      exists
        ? current.filter((item) => item.deity.id !== id)
        : [...current, { deityId: id, deity: { id, name } }],
    );
  }

  function toggleHotelAmenity(id: number, title: string) {
    const current = selected.hotel?.amenities ?? [];
    const exists = current.some((item) => item.amenity.id === id);
    updateHotel(
      'amenities',
      exists
        ? current.filter((item) => item.amenity.id !== id)
        : [...current, { amenityId: id, amenity: { id, title } }],
    );
  }

  async function openEditor(location?: LocationRecord) {
    const activeLocation = location?.id ? mapLocationToForm(location) : emptyLocation;
    setSelected(activeLocation);
    
    if (activeLocation.state) {
      const allStates = State.getAllStates();
      const matchedState = allStates.find(
        (s) => s.name.toLowerCase() === activeLocation.state?.toLowerCase()
      );
      if (matchedState) {
        setSelectedCountryCode(matchedState.countryCode);
        setSelectedStateCode(matchedState.isoCode);
        const countryObj = Country.getCountryByCode(matchedState.countryCode);
        setSelectedCountryName(countryObj?.name ?? 'India');
      } else {
        setSelectedCountryCode('IN');
        setSelectedStateCode('');
        setSelectedCountryName('India');
      }
    } else {
      setSelectedCountryCode('IN');
      setSelectedStateCode('');
      setSelectedCountryName('India');
    }
    
    setValidationError(null);
    setCountryError(null);
    setStateError(null);
    setDistrictError(null);
    setLatError(null);
    setLonError(null);
    setLatInput(activeLocation.latitude ? String(activeLocation.latitude) : '');
    setLonInput(activeLocation.longitude ? String(activeLocation.longitude) : '');
    setMapUrlError(null);
    setMapSearchQuery('');
    setMapSuggestions([]);
    setShowSuggestions(false);
    setCoordTab('map');
    setEditorTab(location?.id ? 'manual' : 'map');
    setSaving(false);
    setDeletingId(null);
    isSavingRef.current = false;
    if (activeLocation.latitude && activeLocation.longitude) {
      setMapCenter([activeLocation.latitude, activeLocation.longitude]);
      setMapZoom(15);
    } else {
      const countryObj = Country.getAllCountries().find(
        (c) => c.name.toLowerCase() === selectedCountryName.toLowerCase()
      );
      handleGeocodeRegion(countryObj?.name || 'India', activeLocation.state || '', activeLocation.district || '');
    }
    setOpen(true);
  }

  const isFormValid = useMemo(() => {
    if (!selected.name.trim()) return false;
    if (!selectedCountryName.trim() || countryError) return false;
    if (!selected.state?.trim() || stateError) return false;
    if (!selected.district?.trim() || districtError) return false;
    
    // Validate country matches list
    const isCountryMatch = Country.getAllCountries().some(
      (c) => c.name.toLowerCase() === selectedCountryName.toLowerCase()
    );
    if (!isCountryMatch) return false;

    // Validate state matches list of country
    const states = State.getStatesOfCountry(selectedCountryCode);
    const isStateMatch = states.some(
      (s) => s.name.toLowerCase() === (selected.state ?? '').toLowerCase()
    );
    if (!isStateMatch) return false;

    // Validate district matches list of state
    const cities = City.getCitiesOfState(selectedCountryCode, selectedStateCode);
    const isDistrictMatch = cities.some(
      (c) => c.name.toLowerCase() === (selected.district ?? '').toLowerCase()
    );
    if (!isDistrictMatch) return false;
    
    // Check latitude range & decimal format
    const latNum = Number(latInput);
    if (!latInput.trim() || isNaN(latNum) || latNum < 8 || latNum > 38 || Number.isInteger(latNum) || latError) return false;
    
    // Check longitude range & decimal format
    const lonNum = Number(lonInput);
    if (!lonInput.trim() || isNaN(lonNum) || lonNum < 68 || lonNum > 98 || Number.isInteger(lonNum) || lonError) return false;
    
    if (mapUrlError) return false;
    return true;
  }, [
    selected.name,
    selectedCountryName,
    selectedCountryCode,
    selectedStateCode,
    selected.state,
    selected.district,
    countryError,
    stateError,
    districtError,
    latInput,
    lonInput,
    latError,
    lonError,
    mapUrlError
  ]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!selected.name.trim()) {
      errors.push("Name is required.");
    }
    
    // Country
    if (!selectedCountryName.trim()) {
      errors.push("Country is required.");
    } else {
      const isCountryMatch = Country.getAllCountries().some(
        (c) => c.name.toLowerCase() === selectedCountryName.toLowerCase()
      );
      if (!isCountryMatch) {
        errors.push("Please select a valid Country from the list.");
      }
    }

    // State
    if (!selected.state?.trim()) {
      errors.push("State is required.");
    } else {
      const states = State.getStatesOfCountry(selectedCountryCode);
      const isStateMatch = states.some(
        (s) => s.name.toLowerCase() === (selected.state ?? '').toLowerCase()
      );
      if (!isStateMatch) {
        errors.push("Please select a valid State from the list.");
      }
    }

    // District
    if (!selected.district?.trim()) {
      errors.push("District/City is required.");
    } else {
      const cities = City.getCitiesOfState(selectedCountryCode, selectedStateCode);
      const isDistrictMatch = cities.some(
        (c) => c.name.toLowerCase() === (selected.district ?? '').toLowerCase()
      );
      if (!isDistrictMatch) {
        errors.push("Please select a valid District/City from the list.");
      }
    }

    // Latitude
    const latNum = Number(latInput);
    if (!latInput.trim()) {
      errors.push("Latitude is required.");
    } else if (isNaN(latNum) || latNum < 8 || latNum > 38) {
      errors.push("Latitude must be a valid number between 8.0 and 38.0 (India region).");
    } else if (Number.isInteger(latNum)) {
      errors.push("Latitude must be a decimal number (not an integer) with at least 3 decimal places.");
    } else {
      const decRegex = /^-?\d+\.\d{3,}$/;
      if (!decRegex.test(latInput.trim())) {
        errors.push("Latitude must be a decimal number with at least 3 decimal places (e.g., 12.031).");
      }
    }

    // Longitude
    const lonNum = Number(lonInput);
    if (!lonInput.trim()) {
      errors.push("Longitude is required.");
    } else if (isNaN(lonNum) || lonNum < 68 || lonNum > 98) {
      errors.push("Longitude must be a valid number between 68.0 and 98.0 (India region).");
    } else if (Number.isInteger(lonNum)) {
      errors.push("Longitude must be a decimal number (not an integer) with at least 3 decimal places.");
    } else {
      const decRegex = /^-?\d+\.\d{3,}$/;
      if (!decRegex.test(lonInput.trim())) {
        errors.push("Longitude must be a decimal number with at least 3 decimal places (e.g., 75.357).");
      }
    }

    if (mapUrlError) {
      errors.push(mapUrlError);
    }

    return errors;
  }, [
    selected.name,
    selectedCountryName,
    selectedCountryCode,
    selectedStateCode,
    selected.state,
    selected.district,
    latInput,
    lonInput,
    mapUrlError,
    countryError,
    stateError,
    districtError,
    latError,
    lonError
  ]);

  async function save() {
    if (!token) return;
    if (isSavingRef.current) return;

    const isCountryValid = validateCountry(selectedCountryName);
    const isStateValid = validateState(selected.state ?? '');
    const isDistrictValid = validateDistrict(selected.district ?? '');
    const isLatValid = validateLatitude(latInput);
    const isLonValid = validateLongitude(lonInput);

    if (!isCountryValid || !isStateValid || !isDistrictValid || !isLatValid || !isLonValid) {
      setValidationError("Please correct the highlighted errors before saving.");
      return;
    }

    const matchedCountry = Country.getAllCountries().find(
      (c) => c.name.toLowerCase() === selectedCountryName.toLowerCase()
    );
    if (!matchedCountry) return;

    setValidationError(null);
    setSaving(true);
    isSavingRef.current = true;

    try {
      const payload = {
        ...selected,
        latitude: Number(latInput),
        longitude: Number(lonInput),
        temple:
          selected.category === 'TEMPLE'
            ? {
                history: selected.temple?.history ?? '',
                historyMl: selected.temple?.historyMl ?? '',
                openTime: selected.temple?.openTime ?? '',
                closeTime: selected.temple?.closeTime ?? '',
                vazhipaduData: (selected.temple?.vazhipaduData as VazhipaduItem[]).filter(
                  (item) => item.name.trim() || item.price.trim(),
                ),
                deityIds:
                  selected.temple?.deities?.map(
                    (item) => item.deity.id ?? item.deityId,
                  ) ?? [],
              }
            : null,
        hotel:
          ['HOTEL', 'RENTAL'].includes(selected.category)
            ? {
                pricePerDay: selected.hotel?.pricePerDay ?? '0',
                contactPhone: selected.hotel?.contactPhone ?? '',
                whatsapp: selected.hotel?.whatsapp ?? '',
                amenityIds:
                  selected.hotel?.amenities?.map(
                    (item) => item.amenity.id ?? item.amenityId,
                  ) ?? [],
              }
            : null,
        restaurant:
          selected.category === 'RESTAURANT'
            ? {
                isPureVeg: selected.restaurant?.isPureVeg ?? true,
                menuItems:
                  selected.restaurant?.menuItems?.filter(
                    (item) => item.name.trim() || item.price.trim() || item.image?.trim(),
                  ) ?? [],
              }
            : null,
        media:
          selected.media?.filter(
            (item) => item.url.trim() || item.thumbnailUrl?.trim(),
          ) ?? [],
      };

      if (selected.id) {
        await api.patch(`/admin/locations/${selected.id}`, payload, token);
      } else {
        await api.post('/admin/locations', payload, token);
      }

      setOpen(false);
      setSelected(emptyLocation);
      refresh();
    } catch (err: any) {
      console.error('Save error:', err);
      setValidationError(err?.message || 'An error occurred while saving the location.');
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  }

  async function remove(id: string) {
    if (!token) return;
    if (isSavingRef.current) return;
    setDeletingId(id);
    isSavingRef.current = true;
    try {
      await api.delete(`/admin/locations/${id}`, token);
      if (selected.id === id) {
        setOpen(false);
        setSelected(emptyLocation);
      }
      refresh();
    } catch (err: any) {
      console.error('Delete error:', err);
      setValidationError(err?.message || 'An error occurred while deleting the location.');
    } finally {
      setDeletingId(null);
      isSavingRef.current = false;
    }
  }

  useEffect(() => {
    setValidationError(null);
  }, [selected.name, selected.category, selected.state, selected.district, selectedCountryName, latInput, lonInput]);

  return (
    <section>
      <PageHeader
        title="Locations"
        subtitle="Operate temples, rentals, restaurants, and nested subtype content from one editor."
      />

      <div className="filters-bar">
        <input
          className="toolbar-select"
          placeholder="Search name or address"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="toolbar-select"
          value={categoryFilter}
          onChange={(e) => {
            setPage(1);
            setCategoryFilter(e.target.value);
          }}
        >
          <option value="">All categories</option>
          {options?.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          className="toolbar-select"
          placeholder="State"
          value={stateFilter}
          onChange={(e) => {
            setPage(1);
            setStateFilter(e.target.value);
          }}
        />
        <input
          className="toolbar-select"
          placeholder="District"
          value={districtFilter}
          onChange={(e) => {
            setPage(1);
            setDistrictFilter(e.target.value);
          }}
        />
        <select
          className="toolbar-select"
          value={hasMedia}
          onChange={(e) => {
            setPage(1);
            setHasMedia(e.target.value);
          }}
        >
          <option value="">Media: all</option>
          <option value="true">Has media</option>
          <option value="false">No media</option>
        </select>
        <button className="primary-button" onClick={() => openEditor()}>
          <PlusIcon width={16} height={16} />
          Add location
        </button>
      </div>

      {loading ? <div className="empty-state">Loading locations...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {data ? (
        <>
          <EntityTable
            rows={data.items}
            getKey={(row) => row.id}
            onSelect={openEditor}
            columns={[
              {
                label: 'Image',
                render: (row) =>
                  row.media?.[0]?.url ? (
                    <img className="thumb" src={row.media[0].url} alt={row.name} />
                  ) : (
                    <div className="thumb" />
                  ),
              },
              { label: 'Name', render: (row) => row.name },
              { label: 'Category', render: (row) => row.category },
              {
                label: 'Region',
                render: (row) => `${row.district ?? ''}, ${row.state ?? ''}`,
              },
            ]}
            actions={(row) => (
              <div className="action-row">
                <button
                  className="icon-button"
                  onClick={() => openEditor(row)}
                  aria-label="Edit location"
                  disabled={saving || deleting}
                >
                  <EditIcon width={16} height={16} />
                </button>
                <button
                  className="danger-icon-button"
                  onClick={() => remove(row.id)}
                  aria-label="Delete location"
                  disabled={saving || deleting}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '34px', minHeight: '34px' }}
                >
                  {deletingId === row.id ? (
                    <span className="spinner" />
                  ) : (
                    <DeleteIcon width={16} height={16} />
                  )}
                </button>
              </div>
            )}
          />
          <PaginationBar
            page={data.pagination.page}
            total={data.pagination.total}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <Modal
        open={open}
        title={selected.id ? 'Edit location' : 'New location'}
        onClose={() => {
          setOpen(false);
          setValidationError(null);
          setCountryError(null);
          setStateError(null);
          setDistrictError(null);
          setLatError(null);
          setLonError(null);
          setMapUrlError(null);
          setLatInput('');
          setLonInput('');
          setMapUrl('');
        }}
      >
        <div className="main-tabs" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', gap: '1rem' }}>
          <button
            type="button"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              border: 'none',
              borderBottom: '2px solid ' + (editorTab === 'map' ? '#FA6A35' : 'transparent'),
              color: editorTab === 'map' ? '#FA6A35' : '#64748b',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
            onClick={() => setEditorTab('map')}
          >
            Map
          </button>
          <button
            type="button"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              border: 'none',
              borderBottom: '2px solid ' + (editorTab === 'manual' ? '#FA6A35' : 'transparent'),
              color: editorTab === 'manual' ? '#FA6A35' : '#64748b',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
            onClick={() => setEditorTab('manual')}
          >
            Manual
          </button>
        </div>

        <div className="editor-panel">
          {validationError ? (
            <div className="error-banner" style={{ marginBottom: '1.5rem' }}>
              {validationError}
            </div>
          ) : null}

          {editorTab === 'map' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '450px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Search landmark, temple, or address to place marker..."
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (mapSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (mapSuggestions.length > 0) {
                          handleSelectSuggestion(mapSuggestions[0]);
                        } else {
                          handleMapSearch(mapSearchQuery);
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      outlineColor: '#FA6A35'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (mapSuggestions.length > 0) {
                        handleSelectSuggestion(mapSuggestions[0]);
                      } else {
                        handleMapSearch(mapSearchQuery);
                      }
                    }}
                    style={{
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.85rem',
                      backgroundColor: '#FA6A35',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    Search
                  </button>
                </div>

                {showSuggestions && mapSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    zIndex: 9999,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '2px'
                  }}>
                    {mapSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(s);
                        }}
                        style={{
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.8rem',
                          color: '#334155',
                          cursor: 'pointer',
                          borderBottom: idx === mapSuggestions.length - 1 ? 'none' : '1px solid #f1f5f9',
                          backgroundColor: '#fff',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.color = '#FA6A35';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fff';
                          e.currentTarget.style.color = '#334155';
                        }}
                      >
                        📍 {s.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, width: '100%', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', position: 'relative', zIndex: 1 }}>
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapController center={mapCenter} zoom={mapZoom} />
                  <MapEventsHandler
                    onSelectCoords={handleMapClickCoords}
                  />
                  {latInput && lonInput && !isNaN(Number(latInput)) && !isNaN(Number(lonInput)) && (
                    <Marker position={[Number(latInput), Number(lonInput)]} />
                  )}
                </MapContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                {latInput && lonInput ? (
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    Selected: <strong>Lat:</strong> {latInput}, <strong>Lon:</strong> {lonInput}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                    Click on the map or search to place a marker.
                  </div>
                )}
                {latInput && lonInput && (
                  <button
                    type="button"
                    onClick={() => setEditorTab('manual')}
                    style={{
                      padding: '0.4rem 1rem',
                      fontSize: '0.8rem',
                      backgroundColor: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    Confirm & Enter Details →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="form-grid">
            <FormField
              label="Name"
              value={selected.name}
              onChange={(e) => updateBase('name', e.target.value)}
            />
            <FormField
              label="Name (ML)"
              value={selected.nameMl ?? ''}
              onChange={(e) => updateBase('nameMl', e.target.value)}
            />
            <FormField
              label="Category"
              value={selected.category}
              options={options?.categories ?? ['TEMPLE']}
              onChange={(e) => updateBase('category', e.target.value)}
            />
            <FormField
              label="Address"
              value={selected.addressText}
              onChange={(e) => updateBase('addressText', e.target.value)}
            />
            <FormField
              label="Address (ML)"
              value={selected.addressTextMl ?? ''}
              onChange={(e) => updateBase('addressTextMl', e.target.value)}
            />
            <FormField
              label="Country"
              datalist
              value={selectedCountryName}
              options={Country.getAllCountries().map((c) => c.name)}
              error={countryError}
              onChange={(e) => {
                setValidationError(null);
                setCountryError(null);
                const countryName = e.target.value;
                setSelectedCountryName(countryName);
                const countryObj = Country.getAllCountries().find(
                  (c) => c.name.toLowerCase() === countryName.toLowerCase()
                );
                if (countryObj) {
                  setSelectedCountryCode(countryObj.isoCode);
                  setSelectedStateCode('');
                  updateBase('state', '');
                  updateBase('district', '');
                }
              }}
              onBlur={(e) => validateCountry(e.target.value)}
            />
            <FormField
              label="State"
              datalist
              value={selected.state ?? ''}
              options={['', ...State.getStatesOfCountry(selectedCountryCode).map((s) => s.name)]}
              error={stateError}
              onChange={(e) => {
                setValidationError(null);
                setStateError(null);
                const stateName = e.target.value;
                updateBase('state', stateName);
                
                const statesOfCountry = State.getStatesOfCountry(selectedCountryCode);
                const stateObj = statesOfCountry.find(
                  (s) => s.name.toLowerCase() === stateName.toLowerCase()
                );
                if (stateObj) {
                  setSelectedStateCode(stateObj.isoCode);
                  updateBase('district', '');
                }
              }}
              onBlur={(e) => validateState(e.target.value)}
            />
            <FormField
              label="District"
              datalist
              value={selected.district ?? ''}
              options={['', ...City.getCitiesOfState(selectedCountryCode, selectedStateCode).map((c) => c.name)]}
              error={districtError}
              onChange={(e) => {
                setValidationError(null);
                setDistrictError(null);
                updateBase('district', e.target.value);
              }}
              onBlur={(e) => validateDistrict(e.target.value)}
            />
            <div className="sub-panel" style={{ gridColumn: 'span 2', marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', backgroundColor: '#f8fafc' }}>
              <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Coordinates</h3>
                <div className="tab-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.8rem',
                      border: '1px solid ' + (coordTab === 'map' ? '#FA6A35' : '#cbd5e1'),
                      borderRadius: '4px',
                      backgroundColor: coordTab === 'map' ? '#FA6A35' : '#fff',
                      color: coordTab === 'map' ? '#fff' : '#475569',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                    onClick={() => setCoordTab('map')}
                  >
                    Map
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.8rem',
                      border: '1px solid ' + (coordTab === 'url' ? '#FA6A35' : '#cbd5e1'),
                      borderRadius: '4px',
                      backgroundColor: coordTab === 'url' ? '#FA6A35' : '#fff',
                      color: coordTab === 'url' ? '#fff' : '#475569',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                    onClick={() => setCoordTab('url')}
                  >
                    Google Map URL
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.8rem',
                      border: '1px solid ' + (coordTab === 'manual' ? '#FA6A35' : '#cbd5e1'),
                      borderRadius: '4px',
                      backgroundColor: coordTab === 'manual' ? '#FA6A35' : '#fff',
                      color: coordTab === 'manual' ? '#fff' : '#475569',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                    onClick={() => setCoordTab('manual')}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {coordTab === 'map' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Search landmark, temple, or address..."
                        value={mapSearchQuery}
                        onChange={(e) => setMapSearchQuery(e.target.value)}
                        onFocus={() => {
                          if (mapSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (mapSuggestions.length > 0) {
                              handleSelectSuggestion(mapSuggestions[0]);
                            } else {
                              handleMapSearch(mapSearchQuery);
                            }
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.85rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          outlineColor: '#FA6A35'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (mapSuggestions.length > 0) {
                            handleSelectSuggestion(mapSuggestions[0]);
                          } else {
                            handleMapSearch(mapSearchQuery);
                          }
                        }}
                        style={{
                          padding: '0.4rem 1rem',
                          fontSize: '0.85rem',
                          backgroundColor: '#FA6A35',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        Search
                      </button>
                    </div>

                    {showSuggestions && mapSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        zIndex: 9999,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}>
                        {mapSuggestions.map((s, idx) => (
                          <div
                            key={idx}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectSuggestion(s);
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.8rem',
                              color: '#334155',
                              cursor: 'pointer',
                              borderBottom: idx === mapSuggestions.length - 1 ? 'none' : '1px solid #f1f5f9',
                              backgroundColor: '#fff',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                              e.currentTarget.style.color = '#FA6A35';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fff';
                              e.currentTarget.style.color = '#334155';
                            }}
                          >
                            📍 {s.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ height: '250px', width: '100%', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1', position: 'relative', zIndex: 1 }}>
                    <MapContainer
                      center={mapCenter}
                      zoom={mapZoom}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapController center={mapCenter} zoom={mapZoom} />
                      <MapEventsHandler
                        onSelectCoords={(lat, lon) => {
                          const preciseLat = Number(lat.toFixed(6));
                          const preciseLon = Number(lon.toFixed(6));
                          setLatInput(String(preciseLat));
                          setLonInput(String(preciseLon));
                          updateBase('latitude', preciseLat);
                          updateBase('longitude', preciseLon);
                          setLatError(null);
                          setLonError(null);
                        }}
                      />
                      {latInput && lonInput && !isNaN(Number(latInput)) && !isNaN(Number(lonInput)) && (
                        <Marker position={[Number(latInput), Number(lonInput)]} />
                      )}
                    </MapContainer>
                  </div>
                  {latInput && lonInput ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                      Selected on Map: <strong>Latitude:</strong> {latInput}, <strong>Longitude:</strong> {lonInput}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      Click on the map to set location coordinates.
                    </div>
                  )}
                </div>
              ) : coordTab === 'url' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <FormField
                    label="Google Map URL or Coordinates"
                    value={mapUrl}
                    placeholder="Paste URL or coordinates (e.g. 12.0314, 75.3578)"
                    error={mapUrlError}
                    onChange={(e) => {
                      setValidationError(null);
                      setMapUrlError(null);
                      setMapUrl(e.target.value);
                      const parsed = parseCoordinates(e.target.value);
                      if (parsed) {
                        const isLatValid = validateLatitude(parsed.lat);
                        const isLonValid = validateLongitude(parsed.lon);
                        if (isLatValid && isLonValid) {
                          setLatInput(String(parsed.lat));
                          setLonInput(String(parsed.lon));
                          updateBase('latitude', parsed.lat);
                          updateBase('longitude', parsed.lon);
                          setMapUrlError(null);
                        } else {
                          setMapUrlError(`Coordinates parsed but out of range: Lat ${parsed.lat}, Lon ${parsed.lon}.`);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const parsed = parseCoordinates(e.target.value);
                      if (parsed) {
                        const isLatValid = validateLatitude(parsed.lat);
                        const isLonValid = validateLongitude(parsed.lon);
                        if (isLatValid && isLonValid) {
                          setLatInput(String(parsed.lat));
                          setLonInput(String(parsed.lon));
                          updateBase('latitude', parsed.lat);
                          updateBase('longitude', parsed.lon);
                          setMapUrlError(null);
                        } else {
                          setMapUrlError(`Coordinates parsed but out of range: Lat ${parsed.lat}, Lon ${parsed.lon}.`);
                        }
                      } else if (e.target.value.trim() !== '') {
                        setMapUrlError('Could not parse valid coordinates. Enter a Google Maps link or "lat, lon" pair.');
                      }
                    }}
                  />
                  {selected.latitude !== 0 || selected.longitude !== 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Active: <strong>Latitude:</strong> {selected.latitude}, <strong>Longitude:</strong> {selected.longitude}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FormField
                    label="Latitude"
                    value={latInput}
                    error={latError}
                    onChange={(e) => {
                      setValidationError(null);
                      setLatError(null);
                      setLatInput(e.target.value);
                      const num = Number(e.target.value);
                      if (!isNaN(num)) {
                        updateBase('latitude', num);
                      }
                    }}
                    onBlur={(e) => validateLatitude(e.target.value)}
                  />
                  <FormField
                    label="Longitude"
                    value={lonInput}
                    error={lonError}
                    onChange={(e) => {
                      setValidationError(null);
                      setLonError(null);
                      setLonInput(e.target.value);
                      const num = Number(e.target.value);
                      if (!isNaN(num)) {
                        updateBase('longitude', num);
                      }
                    }}
                    onBlur={(e) => validateLongitude(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <FormField
            label="Description"
            value={selected.description ?? ''}
            textarea
            onChange={(e) => updateBase('description', e.target.value)}
          />
          <FormField
            label="Description (ML)"
            value={selected.descriptionMl ?? ''}
            textarea
            onChange={(e) => updateBase('descriptionMl', e.target.value)}
          />

          {selected.category === 'TEMPLE' ? (
            <div className="sub-panel">
              <div className="section-header-row">
                <h3>Temple details</h3>
              </div>
              <FormField
                label="History"
                value={selected.temple?.history ?? ''}
                textarea
                onChange={(e) => updateTemple('history', e.target.value)}
              />
              <FormField
                label="History (ML)"
                value={selected.temple?.historyMl ?? ''}
                textarea
                onChange={(e) => updateTemple('historyMl', e.target.value)}
              />
              <div className="form-grid">
                <FormField
                  label="Open time"
                  value={selected.temple?.openTime ?? ''}
                  onChange={(e) => updateTemple('openTime', e.target.value)}
                />
                <FormField
                  label="Close time"
                  value={selected.temple?.closeTime ?? ''}
                  onChange={(e) => updateTemple('closeTime', e.target.value)}
                />
              </div>

              <div className="section-header-row">
                <h4>Vazhipadu items</h4>
                <button className="icon-button" onClick={addVazhipaduItem} aria-label="Add vazhipadu item">
                  <PlusIcon width={16} height={16} />
                </button>
              </div>
              {((selected.temple?.vazhipaduData as VazhipaduItem[]) ?? []).length ? (
                <div className="dynamic-list">
                  {((selected.temple?.vazhipaduData as VazhipaduItem[]) ?? []).map((item, index) => (
                    <div key={`vazhipadu-${index}`} className="dynamic-row">
                      <FormField
                        label="Name"
                        value={item.name}
                        onChange={(e) => updateVazhipaduItem(index, 'name', e.target.value)}
                      />
                      <FormField
                        label="Price"
                        value={item.price}
                        onChange={(e) => updateVazhipaduItem(index, 'price', e.target.value)}
                      />
                      <button
                        className="danger-icon-button"
                        onClick={() => removeVazhipaduItem(index)}
                        aria-label="Remove vazhipadu item"
                      >
                        <DeleteIcon width={16} height={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-inline-state">No vazhipadu rows yet.</div>
              )}

              <div className="checkbox-grid">
                {options?.deities.map((deity) => (
                  <label key={deity.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(
                        selected.temple?.deities?.some(
                          (item) => item.deity.id === deity.id,
                        ),
                      )}
                      onChange={() => toggleTempleDeity(deity.id, deity.name)}
                    />
                    <span>{deity.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {['HOTEL', 'RENTAL'].includes(selected.category) ? (
            <div className="sub-panel">
              <h3>Accommodation details</h3>
              <div className="form-grid">
                <FormField
                  label="Price per day"
                  value={selected.hotel?.pricePerDay ?? '0'}
                  onChange={(e) => updateHotel('pricePerDay', e.target.value)}
                />
                <FormField
                  label="Contact phone"
                  value={selected.hotel?.contactPhone ?? ''}
                  onChange={(e) => updateHotel('contactPhone', e.target.value)}
                />
                <FormField
                  label="WhatsApp"
                  value={selected.hotel?.whatsapp ?? ''}
                  onChange={(e) => updateHotel('whatsapp', e.target.value)}
                />
              </div>
              <div className="checkbox-grid">
                {options?.amenities.map((amenity) => (
                  <label key={amenity.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(
                        selected.hotel?.amenities?.some(
                          (item) => item.amenity.id === amenity.id,
                        ),
                      )}
                      onChange={() =>
                        toggleHotelAmenity(amenity.id, amenity.title)
                      }
                    />
                    <span>{amenity.title}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {selected.category === 'RESTAURANT' ? (
            <div className="sub-panel">
              <div className="section-header-row">
                <h3>Restaurant details</h3>
                <button className="icon-button" onClick={addMenuItem} aria-label="Add menu item">
                  <PlusIcon width={16} height={16} />
                </button>
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={selected.restaurant?.isPureVeg ?? true}
                  onChange={(e) =>
                    updateRestaurant('isPureVeg', e.target.checked)
                  }
                />
                <span>Pure vegetarian</span>
              </label>
              {(selected.restaurant?.menuItems ?? []).length ? (
                <div className="dynamic-list">
                  {(selected.restaurant?.menuItems ?? []).map((item, index) => (
                    <div key={item.id ?? `menu-${index}`} className="dynamic-card">
                      <div className="dynamic-card-header">
                        <strong>Menu item {index + 1}</strong>
                        <button
                          className="danger-icon-button"
                          onClick={() => removeMenuItem(index)}
                          aria-label="Remove menu item"
                        >
                          <DeleteIcon width={16} height={16} />
                        </button>
                      </div>
                      <div className="form-grid">
                        <FormField
                          label="Name"
                          value={item.name}
                          onChange={(e) => updateMenuItem(index, 'name', e.target.value)}
                        />
                        <FormField
                          label="Price"
                          value={item.price}
                          onChange={(e) => updateMenuItem(index, 'price', e.target.value)}
                        />
                      </div>
                      <UploadField
                        label="Image URL"
                        value={item.image ?? ''}
                        folder="restaurants"
                        onChange={(url) => updateMenuItem(index, 'image', url)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-inline-state">No menu items yet.</div>
              )}
            </div>
          ) : null}

          <div className="sub-panel">
            <div className="section-header-row">
              <h3>Media</h3>
              <div className="inline-action-row">
                <button
                  className="icon-button"
                  onClick={() => addMediaItem('IMAGE')}
                  aria-label="Add image row"
                >
                  <PlusIcon width={16} height={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => addMediaItem('VIDEO')}
                  aria-label="Add video row"
                >
                  <UploadIcon width={16} height={16} />
                </button>
              </div>
            </div>
            {(selected.media ?? []).length ? (
              <div className="dynamic-list">
                {(selected.media ?? []).map((item, index) => (
                  <div key={item.id ?? `media-${index}`} className="dynamic-card">
                    <div className="dynamic-card-header">
                      <strong>Media row {index + 1}</strong>
                      <button
                        className="danger-icon-button"
                        onClick={() => removeMediaItem(index)}
                        aria-label="Remove media row"
                      >
                        <DeleteIcon width={16} height={16} />
                      </button>
                    </div>
                    <div className="form-grid">
                      <FormField
                        label="Type"
                        value={item.type}
                        options={['IMAGE', 'VIDEO']}
                        onChange={(e) =>
                          updateMediaItem(index, 'type', e.target.value as 'IMAGE' | 'VIDEO')
                        }
                      />
                      <FormField
                        label="Thumbnail URL"
                        value={item.thumbnailUrl ?? ''}
                        onChange={(e) => updateMediaItem(index, 'thumbnailUrl', e.target.value)}
                      />
                    </div>
                    {item.type === 'IMAGE' ? (
                      <UploadField
                        label="Media URL"
                        value={item.url}
                        folder="locations"
                        onChange={(url) => updateMediaItem(index, 'url', url)}
                      />
                    ) : (
                      <div className="form-grid">
                        <FormField
                          label="Media URL"
                          value={item.url}
                          onChange={(e) => updateMediaItem(index, 'url', e.target.value)}
                        />
                        <UploadField
                          label="Thumbnail image"
                          value={item.thumbnailUrl ?? ''}
                          folder="locations"
                          onChange={(url) => updateMediaItem(index, 'thumbnailUrl', url)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline-state">No media rows yet.</div>
            )}
          </div>

          {validationError ? (
            <div className="error-banner" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              {validationError}
            </div>
          ) : null}

          {!isFormValid && validationErrors.length > 0 && (
            <div className="error-banner" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <strong>Please resolve the following issues to enable saving:</strong>
              <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                {validationErrors.map((err, idx) => (
                  <li key={idx} style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="button-row">
            <button
              className="primary-button"
              onClick={save}
              disabled={saving || deleting || !isFormValid}
            >
              {saving ? (selected.id ? 'Saving...' : 'Creating...') : (selected.id ? 'Save location' : 'Create location')}
            </button>
            {selected.id ? (
              <button
                className="danger-button"
                onClick={() => remove(selected.id)}
                disabled={saving || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            ) : null}
          </div>
            </>
          )}
        </div>
      </Modal>
    </section>
  );
}
