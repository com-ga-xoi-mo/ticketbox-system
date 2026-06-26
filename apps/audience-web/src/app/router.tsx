import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { PublicLayout } from '../shared/ui/layout/PublicLayout';
import { HomePage } from '../features/concerts/HomePage';
import { EventListPage } from '../features/concerts/EventListPage';
import { EventDetailPage } from '../features/concerts/EventDetailPage';
import { LoginPage } from '../features/auth/LoginPage';
import { AccessDeniedPage } from '../features/auth/AccessDeniedPage';
import { NotFoundPage } from '../features/auth/NotFoundPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { PaymentResultPage } from '../features/account/PaymentResultPage';

const AccountPage = lazy(() => import('../features/account/AccountPage').then(m => ({ default: m.AccountPage })));
const MyOrdersPage = lazy(() => import('../features/account/MyOrdersPage').then(m => ({ default: m.MyOrdersPage })));
const OrderDetailPage = lazy(() => import('../features/account/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const MyTicketsPage = lazy(() => import('../features/account/MyTicketsPage').then(m => ({ default: m.MyTicketsPage })));
const TicketDetailPage = lazy(() => import('../features/account/TicketDetailPage').then(m => ({ default: m.TicketDetailPage })));
const SupportCenterPage = lazy(() => import('../features/account/SupportCenterPage').then(m => ({ default: m.SupportCenterPage })));
const SupportRequestDetailPage = lazy(() => import('../features/account/SupportRequestDetailPage').then(m => ({ default: m.SupportRequestDetailPage })));
const RefundRequestDetailPage = lazy(() => import('../features/account/RefundRequestDetailPage').then(m => ({ default: m.RefundRequestDetailPage })));
const NotificationCenterPage = lazy(() => import('../features/account/NotificationCenterPage').then(m => ({ default: m.NotificationCenterPage })));
const TicketDownloadPage = lazy(() => import('../features/account/TicketDownloadPage').then(m => ({ default: m.TicketDownloadPage })));
const OrderConfirmationPage = lazy(() => import('../features/account/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const ArtistListPage = lazy(() => import('../features/artists').then(m => ({ default: m.ArtistListPage })));
const ArtistProfilePage = lazy(() => import('../features/artists').then(m => ({ default: m.ArtistProfilePage })));
const FavoritesPage = lazy(() => import('../features/favorites').then(m => ({ default: m.FavoritesPage })));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex h-[50vh] items-center justify-center">Loading...</div>}>
    {children}
  </Suspense>
);

const OrderDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/account/orders/${id}`} replace />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/access-denied',
    element: <AccessDeniedPage />,
  },
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/events', element: <EventListPage /> },
      { path: '/events/:slug', element: <EventDetailPage /> },
      { path: '/artists', element: <SuspenseWrapper><ArtistListPage /></SuspenseWrapper> },
      { path: '/artists/:slug', element: <SuspenseWrapper><ArtistProfilePage /></SuspenseWrapper> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/orders/:id/result', element: <PaymentResultPage /> },
      {
        path: '/orders',
        element: <Navigate to="/account/orders" replace />,
      },
      {
        path: '/orders/:id',
        element: <OrderDetailRedirect />,
      },
      {
        path: '/account',
        element: <SuspenseWrapper><AccountPage /></SuspenseWrapper>
      },
      {
        path: '/account/orders',
        element: <SuspenseWrapper><MyOrdersPage /></SuspenseWrapper>
      },
      {
        path: '/account/orders/:id',
        element: <SuspenseWrapper><OrderDetailPage /></SuspenseWrapper>
      },
      {
        path: '/account/orders/:id/confirmation',
        element: <SuspenseWrapper><OrderConfirmationPage /></SuspenseWrapper>
      },
      {
        path: '/account/tickets',
        element: <SuspenseWrapper><MyTicketsPage /></SuspenseWrapper>
      },
      {
        path: '/account/tickets/:id',
        element: <SuspenseWrapper><TicketDetailPage /></SuspenseWrapper>
      },
      {
        path: '/account/tickets/:id/download',
        element: <SuspenseWrapper><TicketDownloadPage /></SuspenseWrapper>
      },
      {
        path: '/account/support',
        element: <SuspenseWrapper><SupportCenterPage /></SuspenseWrapper>
      },
      {
        path: '/account/support/requests/:id',
        element: <SuspenseWrapper><SupportRequestDetailPage /></SuspenseWrapper>
      },
      {
        path: '/account/support/refunds/:id',
        element: <SuspenseWrapper><RefundRequestDetailPage /></SuspenseWrapper>
      },
      {
        path: '/account/notifications',
        element: <SuspenseWrapper><NotificationCenterPage /></SuspenseWrapper>
      },
      {
        path: '/me/favorites',
        element: <SuspenseWrapper><FavoritesPage /></SuspenseWrapper>
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
