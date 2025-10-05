import type { FormState } from '../types';

interface SubmissionSummaryProps {
  form: FormState;
}

const SubmissionSummary = ({ form }: SubmissionSummaryProps) => {
  return (
    <aside className="summary-panel" aria-live="polite">
      <h3>Dispatch preview</h3>
      <dl>
        <div>
          <dt>Email</dt>
          <dd>{form.email || '—'}</dd>
        </div>
        <div>
          <dt>Topics</dt>
          <dd>{form.topics.length ? form.topics.join(', ') : 'Select at least one topic'}</dd>
        </div>
        <div>
          <dt>Sources</dt>
          <dd>{form.sources.length ? form.sources.join(', ') : 'Choose competitor feeds'}</dd>
        </div>
        <div>
          <dt>Send window</dt>
          <dd>
            {form.delivery.primary || 'HH:MM'}
            {form.delivery.secondary ? ` + ${form.delivery.secondary}` : ''}
          </dd>
        </div>
        <div>
          <dt>Submission path</dt>
          <dd>{form.dispatchMethod === 'workflow_dispatch' ? 'Trigger workflow' : 'GitHub issue draft'}</dd>
        </div>
      </dl>
      {form.notes ? (
        <div className="summary-panel__notes">
          <strong>Notes</strong>
          <p>{form.notes}</p>
        </div>
      ) : null}
    </aside>
  );
};

export default SubmissionSummary;
