import { get } from '../../../shared/api/client';

export interface ReportConcertRow {
  id: string;
  title: string;
  startsAt: string;
  status: string;
  posterAssetId: string | null;
  organizerId: string;
  organizerDisplayName: string;
  revenueVnd: number;
  totalTickets: number;
  soldTickets: number;
  eligibleTickets: number;
  checkedInTickets: number;
}

export interface ReportsPaginatedResponse {
  items: ReportConcertRow[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
}

export async function listReports(params: { search?: string, page?: number, limit?: number, status?: string, windowDays?: number, organizerId?: string }): Promise<ReportsPaginatedResponse> {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.append('search', params.search);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.status && params.status !== 'ALL') queryParams.append('status', params.status);
  if (params.windowDays) queryParams.append('windowDays', params.windowDays.toString());
  if (params.organizerId && params.organizerId !== 'ALL') queryParams.append('organizerId', params.organizerId);
  
  return get<ReportsPaginatedResponse>(`/admin/analytics/reports?${queryParams.toString()}`);
}
