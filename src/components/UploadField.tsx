import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../state/auth';
import { UploadIcon } from './AdminIcons';

export function UploadField({
  label,
  value,
  folder,
  onChange,
}: {
  label: string;
  value: string;
  folder: string;
  onChange: (url: string) => void;
}) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(file: File | null) {
    if (!file || !token) return;
    setUploading(true);
    setError('');
    try {
      const response = await api.upload(file, token, folder);
      onChange(response.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="upload-field">
      <label className="field">
        <span>{label}</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
      <label className="upload-button">
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        <UploadIcon width={16} height={16} />
        <span>{uploading ? 'Uploading...' : 'Upload image'}</span>
      </label>
      {value ? <img className="thumb-preview" src={value} alt={label} /> : null}
      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  );
}
