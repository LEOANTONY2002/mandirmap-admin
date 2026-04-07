import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/locations', label: 'Locations' },
  { to: '/festivals', label: 'Festivals' },
  { to: '/deities', label: 'Deities' },
  { to: '/amenities', label: 'Amenities' },
  { to: '/astrologers', label: 'Astrologers' },
  { to: '/users', label: 'Users' },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <div className="brand">MandirMap Admin</div>
          <p className="brand-subtitle">
            Control the whole product from one place.
          </p>
        </div>

        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `nav-link${isActive ? ' nav-link-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar-fallback">{user?.fullName?.[0] ?? 'A'}</div>
            <div>
              <div className="user-name">{user?.fullName ?? 'Admin'}</div>
              <div className="user-email">{user?.email ?? ''}</div>
            </div>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
