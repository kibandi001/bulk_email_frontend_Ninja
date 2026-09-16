// Companies (Tmail API, "Companies" folder). No example responses were
// saved in the collection, so RawCompany's fields are assumed to mirror the
// "Create a company" request body — confirm against a live response.

import { apiClient } from './apiClient';
import type { Company, CreateCompanyInput } from '../types';

interface RawCompany {
  id: number;
  name: string;
  domain: string;
  allowed_sender_emails: string[];
}

function mapCompany(raw: RawCompany): Company {
  return {
    id: raw.id,
    name: raw.name,
    domain: raw.domain,
    allowedSenderEmails: raw.allowed_sender_emails,
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
  });
  return mapCompany(raw);
}
