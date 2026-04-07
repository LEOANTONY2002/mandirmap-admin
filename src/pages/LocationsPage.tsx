import { useMemo, useState } from 'react';
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
    setSelected(location?.id ? mapLocationToForm(location) : emptyLocation);
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
                >
                  <EditIcon width={16} height={16} />
                </button>
                <button
                  className="danger-icon-button"
                  onClick={() => remove(row.id)}
                  aria-label="Delete location"
                >
                  <DeleteIcon width={16} height={16} />
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
