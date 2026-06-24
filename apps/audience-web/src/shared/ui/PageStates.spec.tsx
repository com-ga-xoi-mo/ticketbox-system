import { describe, it, expect } from 'vitest';
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
