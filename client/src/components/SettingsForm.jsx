import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

const BITRATE_OPTIONS = [128, 192, 256, 320];

const TEMPLATE_HELP = 'Allowed placeholders: %(title)s, %(id)s, %(uploader)s, %(upload_date)s, %(ext)s';

function previewFilename(template) {
  const sample = {
    '%(title)s': 'My Favorite Song',
    '%(id)s': 'dQw4w9WgXcQ',
    '%(uploader)s': 'Some Channel',
    '%(upload_date)s': '20240101',
    '%(ext)s': 'mp3'
  };
  let result = template || '';
  for (const [placeholder, value] of Object.entries(sample)) {
    result = result.split(placeholder).join(value);
  }
  return result;
}

export default function SettingsForm() {
  const { settings, updateSettings, addToast } = useAppState();
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!form) {
    return <p>Loading settings…</p>;
  }

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      await updateSettings({
        audioBitrateKbps: Number(form.audioBitrateKbps),
        filenameTemplate: form.filenameTemplate,
        maxQueueSize: Number(form.maxQueueSize),
        cookiesFilePath: form.cookiesFilePath,
        embedThumbnail: form.embedThumbnail,
        embedMetadata: form.embedMetadata
      });
    } catch (err) {
      if (err.status === 400 && err.body?.errors) {
        const byField = {};
        err.body.errors.forEach((e) => {
          byField[e.field] = e.message;
        });
        setFieldErrors(byField);
        addToast('Settings could not be saved — see errors below', 'error');
      } else {
        addToast(err.message || 'Failed to save settings', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="audioBitrateKbps">Audio quality (bitrate)</label>
        <select
          id="audioBitrateKbps"
          value={form.audioBitrateKbps}
          onChange={(e) => setField('audioBitrateKbps', e.target.value)}
        >
          {BITRATE_OPTIONS.map((kbps) => (
            <option key={kbps} value={kbps}>
              {kbps} kbps
            </option>
          ))}
        </select>
        {fieldErrors.audioBitrateKbps && <p className="field__error">{fieldErrors.audioBitrateKbps}</p>}
      </div>

      <div className="field">
        <label htmlFor="filenameTemplate">Filename template</label>
        <input
          id="filenameTemplate"
          type="text"
          value={form.filenameTemplate}
          onChange={(e) => setField('filenameTemplate', e.target.value)}
        />
        <p className="field__help">{TEMPLATE_HELP}</p>
        <p className="field__preview">Preview: {previewFilename(form.filenameTemplate)}</p>
        {fieldErrors.filenameTemplate && <p className="field__error">{fieldErrors.filenameTemplate}</p>}
      </div>

      <div className="field">
        <label htmlFor="maxQueueSize">Max queue size</label>
        <input
          id="maxQueueSize"
          type="number"
          min="1"
          value={form.maxQueueSize}
          onChange={(e) => setField('maxQueueSize', e.target.value)}
        />
        {fieldErrors.maxQueueSize && <p className="field__error">{fieldErrors.maxQueueSize}</p>}
      </div>

      <div className="field">
        <label htmlFor="cookiesFilePath">Cookies file (optional, for age-restricted videos)</label>
        <input
          id="cookiesFilePath"
          type="text"
          placeholder="/absolute/path/to/cookies.txt"
          value={form.cookiesFilePath}
          onChange={(e) => setField('cookiesFilePath', e.target.value)}
        />
        {fieldErrors.cookiesFilePath && <p className="field__error">{fieldErrors.cookiesFilePath}</p>}
      </div>

      <div className="field field--checkbox">
        <label>
          <input
            type="checkbox"
            checked={form.embedThumbnail}
            onChange={(e) => setField('embedThumbnail', e.target.checked)}
          />
          Embed thumbnail as cover art
        </label>
      </div>

      <div className="field field--checkbox">
        <label>
          <input
            type="checkbox"
            checked={form.embedMetadata}
            onChange={(e) => setField('embedMetadata', e.target.checked)}
          />
          Embed metadata (ID3 tags)
        </label>
      </div>

      <button type="submit" className="button button--primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  );
}
