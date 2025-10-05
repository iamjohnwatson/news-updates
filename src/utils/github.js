const repoOwner = import.meta.env.VITE_GITHUB_OWNER ?? '';
const repoName = import.meta.env.VITE_GITHUB_REPO ?? '';
const workflowFile = import.meta.env.VITE_WORKFLOW_FILE ?? 'register-newsletter.yml';
const defaultBranch = import.meta.env.VITE_DEFAULT_BRANCH ?? 'main';
const assertRepoConfig = () => {
    if (!repoOwner || !repoName) {
        throw new Error('Repository owner/name are not configured. Set VITE_GITHUB_OWNER and VITE_GITHUB_REPO.');
    }
};
export const buildSubmissionPayload = (form) => {
    assertRepoConfig();
    return {
        repoOwner,
        repoName,
        workflow: workflowFile,
        inputs: {
            email: form.email,
            topics: form.topics,
            sources: form.sources,
            primarySendTime: form.delivery.primary,
            secondarySendTime: form.delivery.secondary || undefined,
            notes: form.notes?.trim() || undefined
        }
    };
};
export const dispatchWorkflow = async (form) => {
    const payload = buildSubmissionPayload(form);
    if (!form.githubToken) {
        throw new Error('A GitHub fine-grained token is required for workflow dispatch.');
    }
    const response = await fetch(`https://api.github.com/repos/${payload.repoOwner}/${payload.repoName}/actions/workflows/${payload.workflow}/dispatches`, {
        method: 'POST',
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${form.githubToken.trim()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ref: defaultBranch,
            inputs: {
                email: payload.inputs.email,
                topics: payload.inputs.topics.join(','),
                sources: payload.inputs.sources.join(','),
                primary_send_time: payload.inputs.primarySendTime,
                secondary_send_time: payload.inputs.secondarySendTime ?? '',
                notes: payload.inputs.notes ?? ''
            }
        })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub workflow dispatch failed: ${response.status} ${response.statusText} — ${errorText}`);
    }
    return payload;
};
export const openIssueDraft = (form) => {
    const payload = buildSubmissionPayload(form);
    const title = encodeURIComponent(`Newsletter request: ${form.email} (${form.delivery.primary}${form.delivery.secondary ? ` + ${form.delivery.secondary}` : ''})`);
    const body = encodeURIComponent([
        '## Newsletter configuration',
        '',
        `- **Email**: ${form.email}`,
        `- **Topics**: ${form.topics.join(', ') || 'None selected'}`,
        `- **Sources**: ${form.sources.join(', ') || 'None selected'}`,
        `- **Primary send time**: ${form.delivery.primary}`,
        `- **Secondary send time**: ${form.delivery.secondary || 'Not set'}`,
        form.notes ? `- **Notes**: ${form.notes}` : null,
        '',
        '> Submitted from Reuters competitor roundup configuration portal'
    ]
        .filter(Boolean)
        .join('\n'));
    const url = `https://github.com/${payload.repoOwner}/${payload.repoName}/issues/new?title=${title}&body=${body}`;
    window.open(url, '_blank', 'noopener');
};
