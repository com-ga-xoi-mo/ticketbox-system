import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

function useBreadcrumbs() {
  const { pathname } = useLocation();

  if (pathname.endsWith('/edit')) {
    return [{ label: 'Sự kiện', path: '/concerts' }, { label: 'Chỉnh sửa' }];
  }
  if (pathname.startsWith('/concerts')) return [{ label: 'Sự kiện' }];
  if (pathname.startsWith('/dashboard')) return [{ label: 'Bảng điều khiển' }];
  if (pathname.startsWith('/staff')) return [{ label: 'Nhân viên' }];
  if (pathname.startsWith('/settings')) return [{ label: 'Cài đặt' }];
  return [];
}

export function ShellLayout() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar breadcrumbs={breadcrumbs} />
        <main className="mt-16 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
