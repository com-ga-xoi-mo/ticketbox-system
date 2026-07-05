import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { PublicLayout } from '../shared/ui/layout/PublicLayout';
import { HomePage } from '../features/concerts/HomePage';
import { EventListPage } from '../features/concerts/EventListPage';
import { EventDetailPage } from '../features/concerts/EventDetailPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
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
const ResaleInboxPage = lazy(() => import('../features/account/ResaleInboxPage').then(m => ({ default: m.ResaleInboxPage })));
const ResaleThreadPage = lazy(() => import('../features/account/ResaleThreadPage').then(m => ({ default: m.ResaleThreadPage })));
const TicketDownloadPage = lazy(() => import('../features/account/TicketDownloadPage').then(m => ({ default: m.TicketDownloadPage })));
const OrderConfirmationPage = lazy(() => import('../features/account/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const ArtistListPage = lazy(() => import('../features/artists').then(m => ({ default: m.ArtistListPage })));
const ArtistProfilePage = lazy(() => import('../features/artists').then(m => ({ default: m.ArtistProfilePage })));
const FavoritesPage = lazy(() => import('../features/favorites').then(m => ({ default: m.FavoritesPage })));
const ResalePlatformPage = lazy(() => import('../features/resale/ResalePlatformPage').then(m => ({ default: m.ResalePlatformPage })));
const ResalePlatformListingDetailPage = lazy(() => import('../features/resale/ResalePlatformListingDetailPage').then(m => ({ default: m.ResalePlatformListingDetailPage })));
const ResaleListingDetailPage = lazy(() => import('../features/concerts/ResaleListingDetailPage').then(m => ({ default: m.ResaleListingDetailPage })));
const SellerProfilePage = lazy(() => import('../features/account/SellerProfilePage').then(m => ({ default: m.SellerProfilePage })));
const TransactionHistoryPage = lazy(() => import('../features/account/TransactionHistoryPage').then(m => ({ default: m.TransactionHistoryPage })));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex h-[50vh] items-center justify-center">Loading...</div>}>
    {children}
  </Suspense>
);

const OrderDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/account/orders/${id}`} replace />;
};

const ResaleListingRedirect = () => {
  const { listingId } = useParams();
  return <Navigate to={`/resale/${listingId}`} replace />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
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
      { 
        path: '/events/:slug/resale', 
        element: <Navigate to="/resale" replace /> 
      },
      { 
        path: '/events/:slug/resale/:listingId', 
        element: <ResaleListingRedirect /> 
      },
      { path: '/resale', element: <SuspenseWrapper><ResalePlatformPage /></SuspenseWrapper> },
      { path: '/resale/:listingId', element: <SuspenseWrapper><ResalePlatformListingDetailPage /></SuspenseWrapper> },
      { path: '/sellers/:userId', element: <SuspenseWrapper><SellerProfilePage /></SuspenseWrapper> },
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
        path: '/account/messages',
        element: <SuspenseWrapper><ResaleInboxPage /></SuspenseWrapper>
      },
      {
        path: '/account/messages/:threadId',
        element: <SuspenseWrapper><ResaleThreadPage /></SuspenseWrapper>
      },
      {
        path: '/account/transactions',
        element: <SuspenseWrapper><TransactionHistoryPage /></SuspenseWrapper>
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
