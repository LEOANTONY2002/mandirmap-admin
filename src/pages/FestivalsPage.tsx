import { useMemo, useState } from 'react';
import { EntityTable } from '../components/EntityTable';
import { FormField } from '../components/FormField';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { PaginationBar } from '../components/PaginationBar';
import { UploadField } from '../components/UploadField';
import { DeleteIcon, EditIcon, PlusIcon } from '../components/AdminIcons';
import { useAdminQuery } from '../hooks/useAdminQuery';
import { api } from '../lib/api';
import type { Festival, OptionBundle, PaginatedResponse } from '../lib/types';
import { useAuth } from '../state/auth';

const emptyFestival: Festival = {
  id: '',
  name: '',
  nameMl: '',
  description: '',
  descriptionMl: '',
  startDate: '',
  endDate: '',
  locationId: '',
  deityId: null,
  photoUrl: '',
};

export function FestivalsPage() {
  const { token } = useAuth();
  const { data: options } = useAdminQuery<OptionBundle>('/admin/options');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [deityId, setDeityId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Festival>(emptyFestival);
  const [open, setOpen] = useState(false);

  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (locationId) params.set('locationId', locationId);
    if (deityId) params.set('deityId', deityId);
    return `/admin/festivals?${params.toString()}`;
  }, [deityId, locationId, page, search, status]);

  const { data, loading, error, refresh } =
    useAdminQuery<PaginatedResponse<Festival>>(path, [path]);

  async function save() {
    if (!token) return;
    if (selected.id) {
      await api.patch(`/admin/festivals/${selected.id}`, selected, token);
    } else {
      await api.post('/admin/festivals', selected, token);
    }
    setOpen(false);
    setSelected(emptyFestival);
    refresh();
  }

  async function remove(id: string) {
    if (!token) return;
    await api.delete(`/admin/festivals/${id}`, token);
    if (selected.id === id) {
      setOpen(false);
      setSelected(emptyFestival);
    }
    refresh();
  }

  return (
    <section>
      <PageHeader
        title="Festivals"
        subtitle="Schedule events, connect them to temples and deities, and drive discovery."
      />

      <div className="filters-bar">
        <input
          className="toolbar-select"
          placeholder="Search festivals"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="toolbar-select"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
        <select
          className="toolbar-select"
          value={locationId}
          onChange={(e) => {
            setPage(1);
            setLocationId(e.target.value);
          }}
        >
          <option value="">All temples</option>
          {options?.locations
            .filter((location) => location.category === 'TEMPLE')
            .map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
        </select>
        <select
          className="toolbar-select"
          value={deityId}
          onChange={(e) => {
            setPage(1);
            setDeityId(e.target.value);
          }}
        >
          <option value="">All deities</option>
          {options?.deities.map((deity) => (
            <option key={deity.id} value={deity.id}>
              {deity.name}
            </option>
          ))}
        </select>
        <button
          className="primary-button"
          onClick={() => {
            setSelected(emptyFestival);
            setOpen(true);
          }}
        >
          <PlusIcon width={16} height={16} />
          Add festival
        </button>
      </div>

      {loading ? <div className="empty-state">Loading festivals...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {data ? (
        <>
          <EntityTable
            rows={data.items}
            getKey={(row) => row.id}
            onSelect={(row) => {
              setSelected({
                ...row,
                startDate: row.startDate.slice(0, 10),
                endDate: row.endDate.slice(0, 10),
              });
              setOpen(true);
            }}
            columns={[
              {
                label: 'Image',
                render: (row) =>
                  row.photoUrl ? (
                    <img className="thumb" src={row.photoUrl} alt={row.name} />
                  ) : (
                    <div className="thumb" />
                  ),
              },
              { label: 'Festival', render: (row) => row.name },
              { label: 'Temple', render: (row) => row.location?.name ?? '-' },
              {
                label: 'Dates',
                render: (row) =>
                  `${row.startDate.slice(0, 10)} to ${row.endDate.slice(0, 10)}`,
              },
            ]}
            actions={(row) => (
              <div className="action-row">
                <button
                  className="icon-button"
                  onClick={() => {
                    setSelected({
                      ...row,
                      startDate: row.startDate.slice(0, 10),
                      endDate: row.endDate.slice(0, 10),
                    });
                    setOpen(true);
                  }}
                  aria-label="Edit festival"
                >
                  <EditIcon width={16} height={16} />
                </button>
                <button
                  className="danger-icon-button"
                  onClick={() => remove(row.id)}
                  aria-label="Delete festival"
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
        title={selected.id ? 'Edit festival' : 'New festival'}
        onClose={() => setOpen(false)}
      >
        <div className="editor-panel">
          <UploadField
            label="Poster"
            value={selected.photoUrl ?? ''}
            folder="festivals"
            onChange={(url) => setSelected({ ...selected, photoUrl: url })}
          />
          <div className="form-grid">
            <FormField
              label="Name"
              value={selected.name}
              onChange={(e) => setSelected({ ...selected, name: e.target.value })}
            />
            <FormField
              label="Name (ML)"
              value={selected.nameMl ?? ''}
              onChange={(e) =>
                setSelected({ ...selected, nameMl: e.target.value })
              }
            />
            <FormField
              label="Start date"
              type="date"
              value={selected.startDate}
              onChange={(e) =>
                setSelected({ ...selected, startDate: e.target.value })
              }
            />
            <FormField
              label="End date"
              type="date"
              value={selected.endDate}
              onChange={(e) =>
                setSelected({ ...selected, endDate: e.target.value })
              }
            />
          </div>
          <FormField
            label="Description"
            value={selected.description ?? ''}
            textarea
            onChange={(e) =>
              setSelected({ ...selected, description: e.target.value })
            }
          />
          <FormField
            label="Description (ML)"
            value={selected.descriptionMl ?? ''}
            textarea
            onChange={(e) =>
              setSelected({ ...selected, descriptionMl: e.target.value })
            }
          />
          <div className="form-grid">
            <label className="field">
              <span>Temple</span>
              <select
                value={selected.locationId}
                onChange={(e) =>
                  setSelected({ ...selected, locationId: e.target.value })
                }
              >
                <option value="">Select temple</option>
                {options?.locations
                  .filter((location) => location.category === 'TEMPLE')
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Deity</span>
              <select
                value={selected.deityId ?? ''}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    deityId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">None</option>
                {options?.deities.map((deity) => (
                  <option key={deity.id} value={deity.id}>
                    {deity.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="button-row">
            <button className="primary-button" onClick={save}>
              {selected.id ? 'Save festival' : 'Create festival'}
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
