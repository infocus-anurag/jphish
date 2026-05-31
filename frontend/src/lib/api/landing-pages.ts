import apiClient from '@/lib/api-client';

export type LandingPageCapture = 'none' | 'credentials' | 'credentials_otp' | 'custom';

export interface LandingPage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  htmlContent: string;
  captureType: LandingPageCapture;
  redirectUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandingPageInput {
  name: string;
  slug: string;
  description?: string;
  htmlContent: string;
  captureType: LandingPageCapture;
  redirectUrl?: string;
}

export type UpdateLandingPageInput = Partial<CreateLandingPageInput> & {
  isActive?: boolean;
};

export async function listLandingPages(): Promise<{ items: LandingPage[]; total: number }> {
  const { data } = await apiClient.get<{ items: LandingPage[]; total: number }>('/landing-pages');
  return data;
}

export async function getLandingPage(id: string): Promise<LandingPage> {
  const { data } = await apiClient.get<LandingPage>(`/landing-pages/${id}`);
  return data;
}

export async function createLandingPage(input: CreateLandingPageInput): Promise<LandingPage> {
  const { data } = await apiClient.post<LandingPage>('/landing-pages', input);
  return data;
}

export async function updateLandingPage(
  id: string,
  input: UpdateLandingPageInput,
): Promise<LandingPage> {
  const { data } = await apiClient.patch<LandingPage>(`/landing-pages/${id}`, input);
  return data;
}

export async function deleteLandingPage(id: string): Promise<void> {
  await apiClient.delete(`/landing-pages/${id}`);
}

export function publicLandingPageUrl(slug: string, trackingId = 'preview'): string {
  const base =
    process.env.NEXT_PUBLIC_PHISH_URL || 'http://localhost:3002';
  return `${base}/p/${slug}/${trackingId}`;
}
