import { PageHeader } from '../components/PageHeader';
import { useAdminQuery } from '../hooks/useAdminQuery';
import type { DashboardData } from '../lib/types';

export function DashboardPage() {
  const { data, loading, error } =
    useAdminQuery<DashboardData>('/admin/dashboard');

  return (
    <section>
      <PageHeader
        title="Dashboard"
        subtitle="Live operational snapshot across users, content, places, and media."
      />

      {loading ? <div className="empty-state">Loading dashboard...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {data ? (
        <>
          <div className="stats-grid">
            {Object.entries(data.stats).map(([key, value]) => (
              <div key={key} className="stat-card">
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="panel">
            <h2>Location category mix</h2>
            <div className="chip-row">
              {data.categories.map((item) => (
                <div key={item.category} className="metric-chip">
                  <span>{item.category}</span>
                  <strong>{item._count._all}</strong>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
