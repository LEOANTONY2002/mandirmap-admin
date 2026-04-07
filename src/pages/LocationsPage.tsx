import { ChangeEvent, useMemo, useState } from 'react';
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

const defaultTemple = {
  history: '',
  historyMl: '',
  openTime: '',
  closeTime: '',
  vazhipaduData: {},
  deities: [],
};

const defaultHotel = {
  pricePerDay: '0',
  contactPhone: '',
  whatsapp: '',
  amenities: [],
};

const defaultRestaurant = {
  isPureVeg: true,
  menuItems: [],
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

function mapLocationToForm(location: LocationRecord): LocationRecord {
  return {
    ...location,
    temple: location.temple ?? defaultTemple,
    hotel: location.hotel ?? defaultHotel,
    restaurant: location.restaurant ?? defaultRestaurant,
    media: location.media ?? [],
  };
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
      temple: { ...current.temple, [key]: value },
    }));
  }

  function updateHotel(key: string, value: unknown) {
    setSelected((current) => ({
      ...current,
      hotel: { ...(current.hotel ?? defaultHotel), [key]: value },
    }));
  }

  function updateRestaurant(key: string, value: unknown) {
    setSelected((current) => ({
      ...current,
      restaurant: { ...(current.restaurant ?? defaultRestaurant), [key]: value },
    }));
  }

  async function openEditor(location?: LocationRecord) {
    if (!location?.id) {
      setSelected(emptyLocation);
      setOpen(true);
      return;
    }

    if (!token) return;
    const detail = await api.get<LocationRecord>(
      `/admin/locations/${location.id}`,
      token,
    );
    setSelected(mapLocationToForm(detail));
    setOpen(true);
  }

  async function save() {
    if (!token) return;

    const payload = {
      ...selected,
      temple:
        selected.category === 'TEMPLE'
          ? {
              history: selected.temple?.history ?? '',
              historyMl: selected.temple?.historyMl ?? '',
              openTime: selected.temple?.openTime ?? '',
              closeTime: selected.temple?.closeTime ?? '',
              vazhipaduData: parseJson(selected.temple?.vazhipaduData, {}),
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
              menuItems: selected.restaurant?.menuItems ?? [],
            }
          : null,
      media: selected.media ?? [],
    };

    if (selected.id) {
      await api.patch(`/admin/locations/${selected.id}`, payload, token);
    } else {
      await api.post('/admin/locations', payload, token);
    }

    setOpen(false);
    setSelected(emptyLocation);
    refresh();
  }

  async function remove(id: string) {
    if (!token) return;
    await api.delete(`/admin/locations/${id}`, token);
    if (selected.id === id) {
      setOpen(false);
      setSelected(emptyLocation);
    }
    refresh();
  }

  function onMenuItemsChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const lines = event.target.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    updateRestaurant(
      'menuItems',
      lines.map((line, index) => {
        const [name, price, image] = line.split('|').map((part) => part.trim());
        return {
          id: selected.restaurant?.menuItems?.[index]?.id,
          name: name ?? '',
          price: price ?? '0',
          image: image ?? '',
        };
      }),
    );
  }

  function onMediaChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const lines = event.target.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    updateBase(
      'media',
      lines.map((line, index) => {
        const [type, url, thumbnailUrl] = line.split('|').map((part) => part.trim());
        return {
          id: selected.media?.[index]?.id,
          type: (type as 'IMAGE' | 'VIDEO') || 'IMAGE',
          url: url ?? '',
          thumbnailUrl: thumbnailUrl ?? '',
        };
      }),
    );
  }

  function addMediaUrl(url: string) {
    updateBase('media', [
      ...(selected.media ?? []),
      { type: 'IMAGE', url, thumbnailUrl: '' },
    ]);
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
                <button className="icon-button" onClick={() => openEditor(row)}>
                  Edit
                </button>
                <button
                  className="danger-icon-button"
                  onClick={() => remove(row.id)}
                >
                  Delete
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
        onClose={() => setOpen(false)}
      >
        <div className="editor-panel">
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
              label="District"
              value={selected.district ?? ''}
              onChange={(e) => updateBase('district', e.target.value)}
            />
            <FormField
              label="State"
              value={selected.state ?? ''}
              onChange={(e) => updateBase('state', e.target.value)}
            />
            <FormField
              label="Latitude"
              type="number"
              value={selected.latitude}
              onChange={(e) => updateBase('latitude', Number(e.target.value))}
            />
            <FormField
              label="Longitude"
              type="number"
              value={selected.longitude}
              onChange={(e) => updateBase('longitude', Number(e.target.value))}
            />
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
              <h3>Temple details</h3>
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
              <FormField
                label="Vazhipadu JSON"
                value={stringifyJson(selected.temple?.vazhipaduData)}
                textarea
                onChange={(e) => updateTemple('vazhipaduData', e.target.value)}
              />
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
              <h3>Restaurant details</h3>
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
              <FormField
                label="Menu items"
                value={(selected.restaurant?.menuItems ?? [])
                  .map((item) => `${item.name}|${item.price}|${item.image ?? ''}`)
                  .join('\n')}
                textarea
                onChange={onMenuItemsChange}
                placeholder="Name|Price|Image URL"
              />
            </div>
          ) : null}

          <div className="sub-panel">
            <h3>Media</h3>
            <UploadField
              label="Add image"
              value=""
              folder="locations"
              onChange={addMediaUrl}
            />
            <FormField
              label="Media rows"
              value={(selected.media ?? [])
                .map(
                  (item) =>
                    `${item.type}|${item.url}|${item.thumbnailUrl ?? ''}`,
                )
                .join('\n')}
              textarea
              onChange={onMediaChange}
              placeholder="IMAGE|https://...|https://..."
            />
          </div>

          <div className="button-row">
            <button className="primary-button" onClick={save}>
              {selected.id ? 'Save location' : 'Create location'}
            </button>
            {selected.id ? (
              <button
                className="danger-button"
                onClick={() => remove(selected.id)}
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </Modal>
    </section>
  );
}

function stringifyJson(value: unknown) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJson(value: unknown, fallback: unknown) {
  if (typeof value !== 'string') return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
