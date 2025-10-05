import { FormEvent, useMemo, useState } from 'react';
import TopicSelector from './components/TopicSelector';
import SourceSelector from './components/SourceSelector';
import SchedulePicker from './components/SchedulePicker';
import DispatchChooser from './components/DispatchChooser';
import SubmissionSummary from './components/SubmissionSummary';
import FeedbackBanner from './components/FeedbackBanner';
import PrivacyNotice from './components/PrivacyNotice';
import { useCatalog } from './hooks/useCatalog';
import { dispatchWorkflow, openIssueDraft } from './utils/github';
import { normaliseTime, validateForm } from './utils/validation';
import type { FormState } from './types';
import './styles/layout.css';

const createDefaultForm = (): FormState => ({
  email: '',
  topics: [],
  sources: [],
  delivery: {
    primary: '08:30'
  },
  dispatchMethod: 'workflow_dispatch',
  githubToken: '',
  notes: ''
});

const App = () => {
  const catalog = useCatalog();
  const [form, setForm] = useState<FormState>(() => createDefaultForm());
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'working'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const topicMap = useMemo(() => {
    return new Map(catalog.topics.map((topic) => [topic.id, topic.label]));
  }, [catalog.topics]);

  const sourceMap = useMemo(() => {
    return new Map(catalog.sources.map((source) => [source.id, source.name]));
  }, [catalog.sources]);

  const displayTopics = form.topics.map((topicId) => topicMap.get(topicId) ?? topicId);
  const displaySources = form.sources.map((sourceId) => sourceMap.get(sourceId) ?? sourceId);

  const handleTopicToggle = (id: string) => {
    setForm((prev) => ({
      ...prev,
      topics: prev.topics.includes(id) ? prev.topics.filter((topic) => topic !== id) : [...prev.topics, id]
    }));
  };

  const handleSourceToggle = (id: string) => {
    setForm((prev) => ({
      ...prev,
      sources: prev.sources.includes(id)
        ? prev.sources.filter((source) => source !== id)
        : [...prev.sources, id]
    }));
  };

  const handleScheduleChange = (field: 'primary' | 'secondary', value: string) => {
    setForm((prev) => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        [field]: value ? normaliseTime(value) : value
      }
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateForm(form);

    if (errors.length) {
      setStatus('error');
      setStatusMessage(errors.join(' '));
      return;
    }

    try {
      setStatus('working');
      setStatusMessage('Sending configuration to GitHub…');

      if (form.dispatchMethod === 'workflow_dispatch') {
        await dispatchWorkflow(form);
        setStatus('success');
        setStatusMessage('Workflow triggered. Monitor Actions for confirmation.');
      } else {
        openIssueDraft(form);
        setStatus('success');
        setStatusMessage('Issue draft opened in a new tab. Submit it to finish.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error while dispatching request.';
      setStatus('error');
      setStatusMessage(message);
    }
  };

  const resetForm = () => {
    setForm(createDefaultForm());
    setStatus('idle');
    setStatusMessage('');
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__copy">
          <h1>Competitor roundup autopilot</h1>
          <p>
            Configure twice-daily email briefings compiled from key competitor desks. All ingestion, formatting, and
            delivery runs in GitHub Actions — no servers, no persistence.
          </p>
        </div>
        <div className="hero__meta">
          <p className="hero__repo">
            Repo: {import.meta.env.VITE_GITHUB_OWNER ?? 'owner'}/{import.meta.env.VITE_GITHUB_REPO ?? 'repo'}
          </p>
          <p className="hero__branch">Branch: {import.meta.env.VITE_DEFAULT_BRANCH ?? 'main'}</p>
        </div>
      </header>

      <main className="content">
        <form className="config-form" onSubmit={handleSubmit}>
          <section className="form-card">
            <h2>Tell us who to brief</h2>
            <label>
              <span>Email address</span>
              <input
                type="email"
                required
                placeholder="reporter@reuters.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              <span>Internal notes (optional)</span>
              <textarea
                placeholder="Desk preferences, formatting quirks, escalation contacts…"
                value={form.notes ?? ''}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={3}
              />
            </label>
          </section>

          <section className="form-card">
            <TopicSelector topics={catalog.topics} selected={form.topics} onToggle={handleTopicToggle} />
          </section>

          <section className="form-card">
            <SourceSelector
              sources={catalog.sources}
              selected={form.sources}
              selectedTopics={form.topics}
              onToggle={handleSourceToggle}
            />
          </section>

          <section className="form-card">
            <SchedulePicker
              primary={form.delivery.primary}
              secondary={form.delivery.secondary}
              onChange={handleScheduleChange}
            />
          </section>

          <section className="form-card">
            <DispatchChooser
              method={form.dispatchMethod}
              token={form.githubToken}
              onMethodChange={(method) => setForm({ ...form, dispatchMethod: method })}
              onTokenChange={(token) => setForm({ ...form, githubToken: token })}
            />
          </section>

          <div className="form-actions">
            <button type="submit" className="primary">
              Submit to GitHub
            </button>
            <button type="button" onClick={resetForm} className="secondary">
              Reset form
            </button>
          </div>
          <FeedbackBanner status={status} message={statusMessage} />
        </form>

        <aside className="sidebar">
          <SubmissionSummary
            form={{
              ...form,
              topics: displayTopics,
              sources: displaySources
            }}
          />
          <PrivacyNotice />
        </aside>
      </main>

      <footer className="footer">
        Built for Reuters business desk • All automation runs through GitHub Actions • Need help? Ping #news-automation
      </footer>
    </div>
  );
};

export default App;
