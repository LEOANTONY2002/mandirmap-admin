import { useMemo, useState } from 'react';
import { EntityTable } from '../components/EntityTable';
import { FormField } from '../components/FormField';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { PaginationBar } from '../components/PaginationBar';
import { UploadField } from '../components/UploadField';
import { useAdminQuery } from '../hooks/useAdminQuery';
import { api } from '../lib/api';
import type { PaginatedResponse, UserRow } from '../lib/types';
import { useAuth } from '../state/auth';

const emptyUser: UserRow = {
  id: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  language: 'ENGLISH',
  district: '',
  state: '',
  createdAt: '',
  address1: '',
  address2: '',
  address3: '',
  avatarUrl: '',
};

export function UsersPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [language, setLanguage] = useState('');
  const [hasAvatar, setHasAvatar] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserRow>(emptyUser);
  const [modalOpen, setModalOpen] = useState(false);

  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    });
    if (search) params.set('search', search);
    if (stateFilter) params.set('state', stateFilter);
    if (language) params.set('language', language);
    if (hasAvatar) params.set('hasAvatar', hasAvatar);
    return `/admin/users?${params.toString()}`;
  }, [hasAvatar, language, page, search, stateFilter]);

  const { data, loading, error, refresh } =
    useAdminQuery<PaginatedResponse<UserRow>>(path, [
      search,
      stateFilter,
      language,
      hasAvatar,
      page,
    ]);

  async function save() {
    if (!token || !selected.id) return;
    await api.patch(`/admin/users/${selected.id}`, selected, token);
    setModalOpen(false);
    refresh();
  }

  return (
    <section>
      <PageHeader
        title="Users"
        subtitle="Support operations, profile cleanup, and user identity correction."
      />

      <div className="filters-bar">
        <input
          className="toolbar-select"
          placeholder="Search name, email, phone"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <input
          className="toolbar-select"
          placeholder="Filter by state"
          value={stateFilter}
          onChange={(e) => {
            setPage(1);
            setStateFilter(e.target.value);
          }}
        />
        <select
          className="toolbar-select"
          value={language}
          onChange={(e) => {
            setPage(1);
            setLanguage(e.target.value);
          }}
        >
          <option value="">All languages</option>
          <option value="ENGLISH">ENGLISH</option>
          <option value="MALAYALAM">MALAYALAM</option>
          <option value="TAMIL">TAMIL</option>
          <option value="HINDI">HINDI</option>
          <option value="TELUGU">TELUGU</option>
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
      </div>

      {loading ? <div className="empty-state">Loading users...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {data ? (
        <>
          <EntityTable
            rows={data.items}
            getKey={(row) => row.id}
            onSelect={(row) => {
              setSelected(row);
              setModalOpen(true);
            }}
            columns={[
              {
                label: 'Image',
                render: (row) =>
                  row.avatarUrl ? (
                    <img className="thumb" src={row.avatarUrl} alt={row.fullName} />
                  ) : (
                    <div className="thumb" />
                  ),
              },
              { label: 'Name', render: (row) => row.fullName },
              { label: 'Email', render: (row) => row.email },
              { label: 'Phone', render: (row) => row.phoneNumber },
              { label: 'Language', render: (row) => row.language },
              {
                label: 'Region',
                render: (row) => `${row.district ?? ''}, ${row.state ?? ''}`,
              },
            ]}
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
        open={modalOpen}
        title={selected.fullName || 'Edit user'}
        onClose={() => setModalOpen(false)}
      >
        <div className="editor-panel">
          <UploadField
            label="Avatar"
            value={selected.avatarUrl ?? ''}
            folder="avatars"
            onChange={(url) => setSelected({ ...selected, avatarUrl: url })}
          />
          <div className="form-grid">
            <FormField
              label="Full name"
              value={selected.fullName}
              onChange={(e) =>
                setSelected({ ...selected, fullName: e.target.value })
              }
            />
            <FormField
              label="Email"
              value={selected.email}
              onChange={(e) => setSelected({ ...selected, email: e.target.value })}
            />
            <FormField
              label="Phone"
              value={selected.phoneNumber}
              onChange={(e) =>
                setSelected({ ...selected, phoneNumber: e.target.value })
              }
            />
            <FormField
              label="Language"
              value={selected.language}
              options={['ENGLISH', 'MALAYALAM', 'TAMIL', 'HINDI', 'TELUGU']}
              onChange={(e) =>
                setSelected({ ...selected, language: e.target.value })
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
          </div>
          <FormField
            label="Address 1"
            value={selected.address1 ?? ''}
            onChange={(e) => setSelected({ ...selected, address1: e.target.value })}
          />
          <FormField
            label="Address 2"
            value={selected.address2 ?? ''}
            onChange={(e) => setSelected({ ...selected, address2: e.target.value })}
          />
          <FormField
            label="Address 3"
            value={selected.address3 ?? ''}
            onChange={(e) => setSelected({ ...selected, address3: e.target.value })}
          />
          <div className="button-row">
            <button className="primary-button" onClick={save}>
              Save user
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
