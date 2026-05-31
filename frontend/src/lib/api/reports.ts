import apiClient from '@/lib/api-client';

export interface DashboardSummary {
  campaigns: { total: number; running: number; draft: number; completed: number };
  emails: { sent: number; opened: number; clicked: number; submitted: number; reported: number };
  rates: { openRate: number; clickRate: number; submitRate: number; reportRate: number };
}

export type TrackingEventType =
  | 'open'
  | 'click'
  | 'form_submission'
  | 'reported'
  | 'landing_view';

export interface CampaignReport {
  campaign: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string | null;
    launchedAt: string | null;
  };
  totals: {
    recipients: number;
    sent: number;
    opened: number;
    clicked: number;
    submitted: number;
    reported: number;
  };
  rates: { openRate: number; clickRate: number; submitRate: number; reportRate: number };
  timeline: Array<{ ts: string; type: TrackingEventType; email: string }>;
  submissions: Array<{
    ts: string;
    email: string;
    ip: string | null;
    data: Record<string, unknown>;
  }>;
}

export async function getDashboardReport(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/reports/dashboard');
  return data;
}

export async function getCampaignReport(id: string): Promise<CampaignReport> {
  const { data } = await apiClient.get<CampaignReport>(`/reports/campaigns/${id}`);
  return data;
}
