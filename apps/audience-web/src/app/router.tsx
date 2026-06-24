import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../shared/ui/layout/PublicLayout';
import { HomePage } from '../features/concerts/HomePage';
import { EventListPage } from '../features/concerts/EventListPage';
import { EventDetailPage } from '../features/concerts/EventDetailPage';
import { LoginPage } from '../features/auth/LoginPage';
import { AccessDeniedPage } from '../features/auth/AccessDeniedPage';
import { NotFoundPage } from '../features/auth/NotFoundPage';
import { AccountPage } from '../features/account/AccountPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { PaymentResultPage } from '../features/orders/PaymentResultPage';
import { OrderDetailPage } from '../features/orders/OrderDetailPage';
import { MyOrdersPage } from '../features/orders/MyOrdersPage';

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
      { path: '/account', element: <AccountPage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/orders', element: <MyOrdersPage /> },
      { path: '/orders/:id', element: <OrderDetailPage /> },
      { path: '/orders/:id/result', element: <PaymentResultPage /> },
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
