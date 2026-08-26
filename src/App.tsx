import { lazy, Suspense } from 'react';

const isAdminRoute = () => new URLSearchParams(window.location.search).get('admin') === '1' || window.location.hash.startsWith('#/admin');
const Page = isAdminRoute() ? lazy(() => import('./admin/AdminApp')) : lazy(() => import('./public/PublicApp'));

export default function App() {
  return <Suspense fallback={<main className="loading-screen">Loading tournament…</main>}><Page /></Suspense>;
}

