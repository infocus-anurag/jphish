import apiClient from '@/lib/api-client';

export type EmailTemplateType = 'phishing' | 'training' | 'announcement';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  type: EmailTemplateType;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailTemplateInput {
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  type: EmailTemplateType;
  variables?: string[];
}

export type UpdateEmailTemplateInput = Partial<CreateEmailTemplateInput> & {
  isActive?: boolean;
};

export async function listEmailTemplates(): Promise<[EmailTemplate[], number]> {
  const { data } = await apiClient.get<[EmailTemplate[], number]>('/email-templates');
  return data;
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate> {
  const { data } = await apiClient.get<EmailTemplate>(`/email-templates/${id}`);
  return data;
}

export async function createEmailTemplate(input: CreateEmailTemplateInput): Promise<EmailTemplate> {
  const { data } = await apiClient.post<EmailTemplate>('/email-templates', {
    variables: [],
    ...input,
  });
  return data;
}

export async function updateEmailTemplate(
  id: string,
  input: UpdateEmailTemplateInput,
): Promise<EmailTemplate> {
  const { data } = await apiClient.patch<EmailTemplate>(`/email-templates/${id}`, input);
  return data;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await apiClient.delete(`/email-templates/${id}`);
}

export async function previewEmailTemplate(
  id: string,
  variables: Record<string, string>,
): Promise<{ subject: string; html: string; text: string | null }> {
  const { data } = await apiClient.post(`/email-templates/${id}/preview`, { variables });
  return data;
}
