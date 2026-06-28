import { useEffect, useState } from 'react';
import Head from 'next/head';
import { getUserPreferences, updateUserPreferences } from '@/services/api';

const initialState = {
  titles: [],
  locations: [],
  salaryMin: 0,
  remoteOnly: true,
  visaSponsorshipNeeded: false,
  companyBlocklist: [],
  speedFirst: false,
  privacyMode: false,
};

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await getUserPreferences();
        setPrefs({ ...initialState, ...res.preferences });
      } catch (err) {
        setError(err.message || 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleChange = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSuccess('');
  };

  const handleListChange = (key, value) => {
    const items = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    handleChange(key, items);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateUserPreferences(prefs);
      setSuccess('Preferences saved');
    } catch (err) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Job Preferences</title>
      </Head>
      <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
        <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">Job Preferences</h1>
              <p className="text-sm text-slate-400">Drive monitors and auto-apply behavior.</p>
            </div>
            {success && <span className="text-emerald-400 text-sm">{success}</span>}
            {error && <span className="text-red-400 text-sm">{error}</span>}
          </div>

          {loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Target titles</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                  placeholder="e.g. Senior Frontend Engineer, Fullstack"
                  value={prefs.titles?.join(', ')}
                  onChange={(e) => handleListChange('titles', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Locations</label>
                  <input
                    type="text"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                    placeholder="Remote, New York, Toronto"
                    value={prefs.locations?.join(', ')}
                    onChange={(e) => handleListChange('locations', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Minimum salary (USD)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                    value={prefs.salaryMin ?? 0}
                    onChange={(e) => handleChange('salaryMin', Number(e.target.value || 0))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Toggle
                  label="Remote only"
                  checked={prefs.remoteOnly}
                  onChange={(v) => handleChange('remoteOnly', v)}
                  hint="Only surface remote-friendly jobs"
                />
                <Toggle
                  label="Visa sponsorship needed"
                  checked={prefs.visaSponsorshipNeeded}
                  onChange={(v) => handleChange('visaSponsorshipNeeded', v)}
                  hint="Filter out companies that cannot sponsor"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Company blocklist</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                  placeholder="Comma-separated companies to skip"
                  value={prefs.companyBlocklist?.join(', ')}
                  onChange={(e) => handleListChange('companyBlocklist', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Toggle
                  label="Speed-first auto-apply"
                  checked={prefs.speedFirst}
                  onChange={(v) => handleChange('speedFirst', v)}
                  hint="Skip review; apply as soon as a match appears"
                />
                <Toggle
                  label="Privacy mode"
                  checked={prefs.privacyMode}
                  onChange={(v) => handleChange('privacyMode', v)}
                  hint="Minimize data retention and use local keys"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save preferences'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 text-emerald-500 focus:ring-emerald-500 rounded border-slate-700 bg-slate-800"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm text-slate-200">{label}</span>
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}
