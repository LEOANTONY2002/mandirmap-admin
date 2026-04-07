import { useMemo, useState } from 'react';
import { EntityTable } from '../components/EntityTable';
import { FormField } from '../components/FormField';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { PaginationBar } from '../components/PaginationBar';
import { UploadField } from '../components/UploadField';
import { useAdminQuery } from '../hooks/useAdminQuery';
import { api } from '../lib/api';
import type { Astrologer, PaginatedResponse } from '../lib/types';
import { useAuth } from '../state/auth';

const emptyAstrologer: Astrologer = {
  id: '',
  name: '',
  avatarUrl: '',
  experienceYears: 0,
  languages: [],
  hourlyRate: '0',
  bio: '',
  rating: 0,
  totalRatings: 0,
  isVerified: false,
  phoneNumber: '',
  whatsappNumber: '',
  photoUrls: [],
  latitude: 0,
  longitude: 0,
  district: '',
  state: '',
};

export function AstrologersPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [verified, setVerified] = useState('');
  const [hasAvatar, setHasAvatar] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Astrologer>(emptyAstrologer);
  const [open, setOpen] = useState(false);

  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    });
    if (search) params.set('search', search);
    if (stateFilter) params.set('state', stateFilter);
    if (districtFilter) params.set('district', districtFilter);
    if (verified) params.set('verified', verified);
    if (hasAvatar) params.set('hasAvatar', hasAvatar);
    return `/admin/astrologers?${params.toString()}`;
  }, [districtFilter, hasAvatar, page, search, stateFilter, verified]);

  const { data, loading, error, refresh } =
    useAdminQuery<PaginatedResponse<Astrologer>>(path, [path]);

  async function save() {
    if (!token) return;
    const payload = {
      ...selected,
      languages: selected.languages,
      photoUrls: selected.photoUrls,
    };
    if (selected.id) {
      await api.patch(`/admin/astrologers/${selected.id}`, payload, token);
    } else {
      await api.post('/admin/astrologers', payload, token);
    }
    setOpen(false);
    setSelected(emptyAstrologer);
    refresh();
  }

  async function remove(id: string) {
    if (!token) return;
    await api.delete(`/admin/astrologers/${id}`, token);
    if (selected.id === id) {
      setOpen(false);
      setSelected(emptyAstrologer);
    }
    refresh();
  }

  return (
    <section>
      <PageHeader
        title="Astrologers"
        subtitle="Edit the service directory, visibility, profile images, pricing, and geo data."
      />

      <div className="filters-bar">
        <input
          className="toolbar-select"
          placeholder="Search astrologers"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
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
          value={verified}
          onChange={(e) => {
            setPage(1);
            setVerified(e.target.value);
          }}
        >
          <option value="">Verification: all</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select
          className="toolbar-select"
          value={hasAvatar}
          onChange={(e) => {
            setPage(1);
            setHasAvatar(e.target.value);
          }}
        >
          <option value="">Avatar: all</option>
          <option value="true">Has avatar</option>
          <option value="false">No avatar</option>
        </select>
        <button
          className="primary-button"
          onClick={() => {
            setSelected(emptyAstrologer);
            setOpen(true);
          }}
        >
          Add astrologer
        </button>
      </div>

      {loading ? <div className="empty-state">Loading astrologers...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {data ? (
        <>
          <EntityTable
            rows={data.items}
            getKey={(row) => row.id}
            onSelect={(row) => {
              setSelected(row);
              setOpen(true);
            }}
            columns={[
              {
                label: 'Image',
                render: (row) =>
                  row.avatarUrl ? (
                    <img className="thumb" src={row.avatarUrl} alt={row.name} />
                  ) : (
                    <div className="thumb" />
                  ),
              },
              { label: 'Name', render: (row) => row.name },
              { label: 'Rate', render: (row) => row.hourlyRate },
              {
                label: 'Verified',
                render: (row) => (row.isVerified ? 'Yes' : 'No'),
              },
              {
                label: 'Region',
                render: (row) => `${row.district ?? ''}, ${row.state ?? ''}`,
              },
            ]}
            actions={(row) => (
              <div className="action-row">
                <button
                  className="icon-button"
                  onClick={() => {
                    setSelected(row);
                    setOpen(true);
                  }}
                >
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
        title={selected.id ? 'Edit astrologer' : 'New astrologer'}
        onClose={() => setOpen(false)}
      >
        <div className="editor-panel">
          <UploadField
            label="Avatar"
            value={selected.avatarUrl ?? ''}
            folder="astrologers"
            onChange={(url) => setSelected({ ...selected, avatarUrl: url })}
          />
          <div className="form-grid">
            <FormField
              label="Name"
              value={selected.name}
              onChange={(e) => setSelected({ ...selected, name: e.target.value })}
            />
            <FormField
              label="Experience years"
              type="number"
              value={selected.experienceYears}
              onChange={(e) =>
                setSelected({
                  ...selected,
                  experienceYears: Number(e.target.value),
                })
              }
            />
            <FormField
              label="Hourly rate"
              value={selected.hourlyRate}
              onChange={(e) =>
                setSelected({ ...selected, hourlyRate: e.target.value })
              }
            />
            <FormField
              label="Phone"
              value={selected.phoneNumber ?? ''}
              onChange={(e) =>
                setSelected({ ...selected, phoneNumber: e.target.value })
              }
            />
            <FormField
              label="WhatsApp"
              value={selected.whatsappNumber ?? ''}
              onChange={(e) =>
                setSelected({ ...selected, whatsappNumber: e.target.value })
              }
            />
            <FormField
              label="State"
              value={selected.state ?? ''}
              onChange={(e) => setSelected({ ...selected, state: e.target.value })}
            />
            <FormField
              label="District"
              value={selected.district ?? ''}
              onChange={(e) =>
                setSelected({ ...selected, district: e.target.value })
              }
            />
            <FormField
              label="Latitude"
              type="number"
              value={selected.latitude}
              onChange={(e) =>
                setSelected({ ...selected, latitude: Number(e.target.value) })
              }
            />
            <FormField
              label="Longitude"
              type="number"
              value={selected.longitude}
              onChange={(e) =>
                setSelected({ ...selected, longitude: Number(e.target.value) })
              }
            />
          </div>
          <FormField
            label="Languages (comma separated)"
            value={selected.languages.join(', ')}
            onChange={(e) =>
              setSelected({
                ...selected,
                languages: e.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
          <FormField
            label="Bio"
            value={selected.bio ?? ''}
            textarea
            onChange={(e) => setSelected({ ...selected, bio: e.target.value })}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={selected.isVerified}
              onChange={(e) =>
                setSelected({ ...selected, isVerified: e.target.checked })
              }
            />
            <span>Verified profile</span>
          </label>
          <FormField
            label="Photo URLs (one per line)"
            value={selected.photoUrls.join('\n')}
            textarea
            onChange={(e) =>
              setSelected({
                ...selected,
                photoUrls: e.target.value
                  .split('\n')
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
          <div className="button-row">
            <button className="primary-button" onClick={save}>
              {selected.id ? 'Save astrologer' : 'Create astrologer'}
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
