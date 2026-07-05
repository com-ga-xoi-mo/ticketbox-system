import { Link } from 'react-router-dom';

const actions = [
  {
    to: '/concerts',
    label: 'Xem xét sự kiện',
    detail: 'Kiểm duyệt bản nháp, xuất bản sự kiện, và hủy danh sách không hợp lệ.',
    icon: 'fact_check',
  },
  {
    to: '/staff',
    label: 'Quản lý nhân viên',
    detail: 'Phân công đội check-in đến địa điểm trước khi mở cửa.',
    icon: 'groups',
  },
  {
    to: '/settings',
    label: 'Cài đặt cổng thông tin',
    detail: 'Cập nhật mặc định hoạt động và kiểm soát tài khoản.',
    icon: 'tune',
  },
];

export function QuickActions() {
  return (
    <aside className="glass-panel flex flex-col rounded-xl p-5">
      <div className="border-b border-white/5 pb-5">
        <p className="font-mono text-xs text-on-surface-variant">phím tắt quản trị</p>
        <h2 className="mt-2 font-display text-xl font-bold text-on-surface">Thao tác tiếp theo</h2>
      </div>

      <div className="flex flex-1 flex-col gap-3 pt-5">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group flex min-h-24 items-start gap-4 rounded-lg border border-white/5 bg-surface-container-low/70 p-4 transition-colors duration-200 hover:border-primary/40 hover:bg-surface-container-high/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span
              className="material-symbols-outlined mt-0.5 text-[22px] text-primary"
              aria-hidden="true"
            >
              {action.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-on-surface">{action.label}</span>
              <span className="mt-1 block text-pretty text-sm leading-5 text-on-surface-variant">
                {action.detail}
              </span>
            </span>
            <span
              className="material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
