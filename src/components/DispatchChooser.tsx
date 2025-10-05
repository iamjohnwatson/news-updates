import type { DispatchMethod } from '../types';

interface DispatchChooserProps {
  method: DispatchMethod;
  token?: string;
  onMethodChange: (method: DispatchMethod) => void;
  onTokenChange: (token: string) => void;
}

const DispatchChooser = ({ method, token, onMethodChange, onTokenChange }: DispatchChooserProps) => {
  return (
    <div>
      <h3>How should we hand this to GitHub?</h3>
      <div className="dispatch-options">
        <label className={`dispatch-card ${method === 'workflow_dispatch' ? 'dispatch-card--selected' : ''}`}>
          <input
            type="radio"
            name="dispatch-method"
            value="workflow_dispatch"
            checked={method === 'workflow_dispatch'}
            onChange={() => onMethodChange('workflow_dispatch')}
          />
          <div>
            <strong>Trigger workflow automatically</strong>
            <p>
              Requires a short-lived fine-grained token with <code>actions:write</code> on this repo. Token is only used client-side and never stored.
            </p>
            {method === 'workflow_dispatch' ? (
              <input
                type="password"
                placeholder="GitHub token"
                value={token ?? ''}
                onChange={(event) => onTokenChange(event.target.value)}
                autoComplete="off"
              />
            ) : null}
          </div>
        </label>
        <label className={`dispatch-card ${method === 'issues' ? 'dispatch-card--selected' : ''}`}>
          <input
            type="radio"
            name="dispatch-method"
            value="issues"
            checked={method === 'issues'}
            onChange={() => onMethodChange('issues')}
          />
          <div>
            <strong>Open a pre-filled GitHub issue</strong>
            <p>
              We will open a new browser tab with the configuration ready to file. GitHub login required.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default DispatchChooser;
