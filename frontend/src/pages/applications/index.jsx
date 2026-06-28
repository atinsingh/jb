import { useEffect, useState } from 'react';
import Head from 'next/head';
import { getApplicationActivity, getMyApplications } from '@/services/api';

export default function ApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [appsRes, eventsRes] = await Promise.all([
          getMyApplications({}),
          getApplicationActivity({ limit: 50 }),
        ]);
        setApps(appsRes.applications || []);
        setEvents(eventsRes.events || []);
      } catch (err) {
        setError(err.message || 'Unable to load applications');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFilterChange = async (value) => {
    setFilter(value);
    setLoading(true);
    try {
      const eventsRes = await getApplicationActivity({
        limit: 50,
        type: value === 'all' ? undefined : value,
      });
      setEvents(eventsRes.events || []);
    } catch (err) {
      setError(err.message || 'Unable to load events');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Applications</title>
      </Head>
      <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">Applications</h1>
            <p className="text-sm text-slate-400">Monitor auto-apply outcomes and events.</p>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </header>

          {loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : (
            <>
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <h2 className="text-lg font-semibold mb-3">Applications</h2>
                <div className="space-y-3">
                  {apps.length === 0 && <p className="text-slate-500 text-sm">No applications yet.</p>}
                  {apps.map((app) => (
                    <div
                      key={app._id}
                      className="flex items-center justify-between bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium">{app.jobId?.title || 'Job'}</div>
                        <div className="text-xs text-slate-400">
                          {app.jobId?.companyName || 'Unknown company'} • {app.status}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        Match {app.matchScore ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <h2 className="text-lg font-semibold mb-3">Activity</h2>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-xs text-slate-400">Filter</label>
                  <select
                    className="bg-slate-800 border border-slate-700 rounded-lg text-sm px-3 py-2"
                    value={filter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="new_job_ingested">New jobs</option>
                    <option value="queued">Queued</option>
                    <option value="submitted_stub">Submitted</option>
                    <option value="skipped_preferences">Skipped by prefs</option>
                  </select>
                </div>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {events.length === 0 && <p className="text-slate-500 text-sm">No activity yet.</p>}
                  {events.map((evt) => (
                    <div key={evt._id} className="text-sm border-b border-slate-800 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          <TypeBadge type={evt.type} />
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(evt.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {evt.message && <div className="text-slate-300">{evt.message}</div>}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function TypeBadge({ type }) {
  const map = {
    new_job_ingested: 'bg-emerald-500/20 text-emerald-300 border-emerald-600',
    queued: 'bg-blue-500/20 text-blue-200 border-blue-600',
    submitted_stub: 'bg-amber-500/20 text-amber-200 border-amber-600',
    skipped_preferences: 'bg-rose-500/20 text-rose-200 border-rose-600',
  };
  const cls = map[type] || 'bg-slate-700 text-slate-200 border-slate-600';
  return (
    <span className={`px-2 py-1 text-xs rounded-lg border ${cls}`}>
      {type}
    </span>
  );
}
