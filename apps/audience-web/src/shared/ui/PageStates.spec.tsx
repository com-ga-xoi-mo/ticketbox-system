import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLoading, PageEmpty, PageError } from './PageStates';

describe('PageLoading', () => {
  it('renders without crashing', () => {
    const { container } = render(<PageLoading />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('PageEmpty', () => {
  it('renders default title', () => {
    render(<PageEmpty />);
    expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(<PageEmpty title="Chưa có sự kiện" description="Hãy quay lại sau" />);
    expect(screen.getByText('Chưa có sự kiện')).toBeInTheDocument();
    expect(screen.getByText('Hãy quay lại sau')).toBeInTheDocument();
  });
});

describe('PageError', () => {
  it('renders default error message', () => {
    render(<PageError />);
    expect(screen.getByText('Đã có lỗi xảy ra. Vui lòng thử lại.')).toBeInTheDocument();
  });

  it('renders custom error message', () => {
    render(<PageError message="Không kết nối được server" />);
    expect(screen.getByText('Không kết nối được server')).toBeInTheDocument();
  });
});

import { PageNoResults, PageSoldOut, PageUnavailable } from './PageStates';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

describe('PageNoResults', () => {
  it('renders default message', () => {
    render(<PageNoResults />);
    expect(screen.getByText('Không tìm thấy kết quả')).toBeInTheDocument();
    expect(screen.getByText('Không tìm thấy sự kiện nào phù hợp với bộ lọc.')).toBeInTheDocument();
  });

  it('renders custom message and handles click', async () => {
    const handleClear = vi.fn();
    render(<PageNoResults message="Không có kết quả nào cho 'rock'" onClearFilters={handleClear} />);
    expect(screen.getByText("Không có kết quả nào cho 'rock'")).toBeInTheDocument();
    
    const btn = screen.getByRole('button', { name: /Xóa bộ lọc/i });
    await userEvent.click(btn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});

describe('PageSoldOut', () => {
  it('renders sold out banner', () => {
    render(<PageSoldOut />);
    expect(screen.getByText('Đã hết vé')).toBeInTheDocument();
    expect(screen.getByText(/Sự kiện này đã bán hết toàn bộ vé/i)).toBeInTheDocument();
  });
});

describe('PageUnavailable', () => {
  it('renders unavailable state with link', () => {
    render(
      <BrowserRouter>
        <PageUnavailable />
      </BrowserRouter>
    );
    expect(screen.getByText('Sự kiện không tồn tại')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Khám phá sự kiện khác/i });
    expect(link).toHaveAttribute('href', '/events');
  });
});
