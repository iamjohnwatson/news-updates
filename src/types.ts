export interface Topic {
  id: string;
  label: string;
  description: string;
}

export interface SourceEndpoint {
  type: 'rss' | 'api' | 'scrape';
  topic: string;
  url: string;
  fallback?: 'rss' | 'api' | 'scrape';
  selectors?: Record<string, string>;
}

export interface Source {
  id: string;
  name: string;
  homepage: string;
  supportsTopics: string[];
  endpoints: SourceEndpoint[];
  notes?: string;
}

export interface Catalog {
  topics: Topic[];
  sources: Source[];
}

export interface DeliverySchedule {
  primary: string;
  secondary?: string;
}

export type DispatchMethod = 'workflow_dispatch' | 'issues';

export interface FormState {
  email: string;
  topics: string[];
  sources: string[];
  delivery: DeliverySchedule;
  dispatchMethod: DispatchMethod;
  githubToken?: string;
  notes?: string;
}

export interface SubmissionPayload {
  repoOwner: string;
  repoName: string;
  workflow: string;
  inputs: {
    email: string;
    topics: string[];
    sources: string[];
    primarySendTime: string;
    secondarySendTime?: string;
    notes?: string;
  };
}
