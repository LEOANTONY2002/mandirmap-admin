import { ReactNode, useMemo, useState } from 'react';
import { EntityTable } from '../components/EntityTable';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { PaginationBar } from '../components/PaginationBar';
import { UploadField } from '../components/UploadField';
import { DeleteIcon, EditIcon, PlusIcon } from '../components/AdminIcons';
import { useAdminQuery } from '../hooks/useAdminQuery';
import { api } from '../lib/api';
import type {
  Amenity,
  Deity,
  PaginatedResponse,
} from '../lib/types';
import { useAuth } from '../state/auth';

type ResourceConfig<T extends { id: number }> = {
  title: string;
  subtitle: string;
  path: string;
  folder: string;
  imageKey: keyof T;
  imageFilterKey: string;
  emptyItem: T;
  columns: Array<{ label: string; render: (row: T) => ReactNode }>;
  renderForm: (item: T, setItem: (value: T) => void) => ReactNode;
};

function TaxonomyPage<T extends { id: number }>({
  config,
}: {
  config: ResourceConfig<T>;
}) {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [hasImage, setHasImage] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<T>(config.emptyItem);
  const [open, setOpen] = useState(false);
  const hasSelection = selected.id !== 0;

  const path = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    });
    if (search) params.set('search', search);
    if (hasImage) params.set(config.imageFilterKey, hasImage);
    return `${config.path}?${params.toString()}`;
  }, [config.imageFilterKey, config.path, hasImage, page, search]);

  const { data, loading, error, refresh } =
    useAdminQuery<PaginatedResponse<T>>(path, [path]);

  async function save() {
    if (!token) return;
    if (hasSelection) {
      await api.patch(`${config.path}/${selected.id}`, selected, token);
    } else {
      await api.post(config.path, selected, token);
    }
    setOpen(false);
    setSelected(config.emptyItem);
    refresh();
  }

  async function remove(id: number) {
    if (!token) return;
    await api.delete(`${config.path}/${id}`, token);
    if (selected.id === id) {
      setOpen(false);
      setSelected(config.emptyItem);
    }
    refresh();
  }

  return (
    <section>
      <PageHeader title={config.title} subtitle={config.subtitle} />

      <div className="filters-bar">
        <input
          className="toolbar-select"
          placeholder="Search"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="toolbar-select"
          value={hasImage}
          onChange={(e) => {
            setPage(1);
            setHasImage(e.target.value);
          }}
        >
          <option value="">Image: all</option>
          <option value="true">Has image</option>
          <option value="false">No image</option>
        </select>
        <button
          className="primary-button"
          onClick={() => {
            setSelected(config.emptyItem);
            setOpen(true);
          }}
        >
          <PlusIcon width={16} height={16} />
          Add new
        </button>
      </div>

      {loading ? <div className="empty-state">Loading...</div> : null}
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
                render: (row) => {
                  const url = row[config.imageKey] as string | null | undefined;
                  return url ? <img className="thumb" src={url} alt="" /> : <div className="thumb" />;
                },
              },
              ...config.columns,
            ]}
            actions={(row) => (
              <div className="action-row">
                <button
                  className="icon-button"
                  onClick={() => {
                    setSelected(row);
                    setOpen(true);
                  }}
                  aria-label="Edit item"
                >
                  <EditIcon width={16} height={16} />
                </button>
                <button
                  className="danger-icon-button"
                  onClick={() => remove(row.id)}
                  aria-label="Delete item"
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
        title={hasSelection ? 'Edit item' : 'New item'}
        onClose={() => setOpen(false)}
      >
        <div className="editor-panel">
          <UploadField
            label="Image"
            value={(selected[config.imageKey] as string | null | undefined) ?? ''}
            folder={config.folder}
            onChange={(url) =>
              setSelected({ ...selected, [config.imageKey]: url } as T)
            }
          />
          {config.renderForm(selected, setSelected)}
          <div className="button-row">
            <button className="primary-button" onClick={save}>
              {hasSelection ? 'Save changes' : 'Create item'}
            </button>
            {hasSelection ? (
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

export function DeitiesPage() {
  return (
    <TaxonomyPage<Deity>
      config={{
        title: 'Deities',
        subtitle: 'Manage deity names, Malayalam labels, and iconography.',
        path: '/admin/deities',
        folder: 'deities',
        imageKey: 'photoUrl',
        imageFilterKey: 'hasPhoto',
        emptyItem: { id: 0, name: '', nameMl: '', photoUrl: '' },
        columns: [
          { label: 'Name', render: (row) => row.name },
          { label: 'Malayalam', render: (row) => row.nameMl || '-' },
        ],
        renderForm: (item, setItem) => (
          <>
            <label className="field">
              <span>Name</span>
              <input
                value={item.name}
                onChange={(e) => setItem({ ...item, name: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Name (ML)</span>
              <input
                value={item.nameMl ?? ''}
                onChange={(e) => setItem({ ...item, nameMl: e.target.value })}
              />
            </label>
          </>
        ),
      }}
    />
  );
}

export function AmenitiesPage() {
  return (
    <TaxonomyPage<Amenity>
      config={{
        title: 'Amenities',
        subtitle: 'Control reusable hotel and rental amenity labels and icons.',
        path: '/admin/amenities',
        folder: 'amenities',
        imageKey: 'image',
        imageFilterKey: 'hasImage',
        emptyItem: { id: 0, title: '', image: '' },
        columns: [
          { label: 'Title', render: (row) => row.title },
        ],
        renderForm: (item, setItem) => (
          <label className="field">
            <span>Title</span>
            <input
              value={item.title}
              onChange={(e) => setItem({ ...item, title: e.target.value })}
            />
          </label>
        ),
      }}
    />
  );
}
