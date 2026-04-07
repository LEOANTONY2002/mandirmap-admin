import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './state/auth';
import { AstrologersPage } from './pages/AstrologersPage';
import { DashboardPage } from './pages/DashboardPage';
import { FestivalsPage } from './pages/FestivalsPage';
import { AmenitiesPage, DeitiesPage } from './pages/TaxonomyPage';
import { LocationsPage } from './pages/LocationsPage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';

export function App() {
  const { token } = useAuth();

  if (!token) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/festivals" element={<FestivalsPage />} />
        <Route path="/deities" element={<DeitiesPage />} />
        <Route path="/amenities" element={<AmenitiesPage />} />
        <Route path="/astrologers" element={<AstrologersPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
