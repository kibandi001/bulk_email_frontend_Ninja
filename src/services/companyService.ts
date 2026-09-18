// Companies (Tmail API, "Companies" folder). No example responses were
// saved in the collection, so RawCompany's fields are assumed to mirror the
// "Create a company" request body — confirm against a live response.

import { apiClient } from './apiClient';
import type { Company, CreateCompanyInput } from '../types';

interface RawCompany {
  id: number;
  name: string;
  domain: string;
  allowed_senders?: string[]; // backend returns allowed_senders
  logo?: string;
  logo_url?: string;
}

function mapCompany(raw: RawCompany): Company {
  return {
    id: raw.id,
    name: raw.name,
    domain: raw.domain,
    allowedSenderEmails: raw.allowed_senders || [], //Maps allowed_senders to your UI
    logo: raw.logo || raw.logo_url || '',
  };
}

export async function listCompanies(): Promise<Company[]> {
  const raw = await apiClient.get<RawCompany[]>('/company/');
  return raw.map(mapCompany);
}

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const raw = await apiClient.post<RawCompany>('/company/', {
    name: input.name,
    domain: input.domain,
    allowed_sender_emails: input.allowedSenderEmails,
    logo: input.logo,
  });
  return mapCompany(raw);
}
export async function updateCompany(id: number, input: Partial<CreateCompanyInput>): Promise<Company> {
  const raw = await apiClient.patch<RawCompany>(`/company/${id}/`, {
    name: input.name,
    domain: input.domain,
    allowed_sender_emails: input.allowedSenderEmails,
    logo: input.logo,
  });
  return mapCompany(raw);
}

