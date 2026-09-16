// Shape used by GET/POST /company/ (Tmail API, "Companies" folder).
// Populated by services/companyService.ts.

export interface Company {
  id: number;
  name: string;
  domain: string;
  allowedSenderEmails: string[];
}

export interface CreateCompanyInput {
  name: string;
  domain: string;
  allowedSenderEmails: string[];
}
