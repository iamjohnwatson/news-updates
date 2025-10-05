import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
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
import './styles/layout.css';
const createDefaultForm = () => ({
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
    const [form, setForm] = useState(() => createDefaultForm());
    const [status, setStatus] = useState('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const topicMap = useMemo(() => {
        return new Map(catalog.topics.map((topic) => [topic.id, topic.label]));
    }, [catalog.topics]);
    const sourceMap = useMemo(() => {
        return new Map(catalog.sources.map((source) => [source.id, source.name]));
    }, [catalog.sources]);
    const displayTopics = form.topics.map((topicId) => topicMap.get(topicId) ?? topicId);
    const displaySources = form.sources.map((sourceId) => sourceMap.get(sourceId) ?? sourceId);
    const handleTopicToggle = (id) => {
        setForm((prev) => ({
            ...prev,
            topics: prev.topics.includes(id) ? prev.topics.filter((topic) => topic !== id) : [...prev.topics, id]
        }));
    };
    const handleSourceToggle = (id) => {
        setForm((prev) => ({
            ...prev,
            sources: prev.sources.includes(id)
                ? prev.sources.filter((source) => source !== id)
                : [...prev.sources, id]
        }));
    };
    const handleScheduleChange = (field, value) => {
        setForm((prev) => ({
            ...prev,
            delivery: {
                ...prev.delivery,
                [field]: value ? normaliseTime(value) : value
            }
        }));
    };
    const handleSubmit = async (event) => {
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
            }
            else {
                openIssueDraft(form);
                setStatus('success');
                setStatusMessage('Issue draft opened in a new tab. Submit it to finish.');
            }
        }
        catch (error) {
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
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "hero", children: [_jsxs("div", { className: "hero__copy", children: [_jsx("h1", { children: "Competitor roundup autopilot" }), _jsx("p", { children: "Configure twice-daily email briefings compiled from key competitor desks. All ingestion, formatting, and delivery runs in GitHub Actions \u2014 no servers, no persistence." })] }), _jsxs("div", { className: "hero__meta", children: [_jsxs("p", { className: "hero__repo", children: ["Repo: ", import.meta.env.VITE_GITHUB_OWNER ?? 'owner', "/", import.meta.env.VITE_GITHUB_REPO ?? 'repo'] }), _jsxs("p", { className: "hero__branch", children: ["Branch: ", import.meta.env.VITE_DEFAULT_BRANCH ?? 'main'] })] })] }), _jsxs("main", { className: "content", children: [_jsxs("form", { className: "config-form", onSubmit: handleSubmit, children: [_jsxs("section", { className: "form-card", children: [_jsx("h2", { children: "Tell us who to brief" }), _jsxs("label", { children: [_jsx("span", { children: "Email address" }), _jsx("input", { type: "email", required: true, placeholder: "reporter@reuters.com", value: form.email, onChange: (event) => setForm({ ...form, email: event.target.value }), autoComplete: "off" })] }), _jsxs("label", { children: [_jsx("span", { children: "Internal notes (optional)" }), _jsx("textarea", { placeholder: "Desk preferences, formatting quirks, escalation contacts\u2026", value: form.notes ?? '', onChange: (event) => setForm({ ...form, notes: event.target.value }), rows: 3 })] })] }), _jsx("section", { className: "form-card", children: _jsx(TopicSelector, { topics: catalog.topics, selected: form.topics, onToggle: handleTopicToggle }) }), _jsx("section", { className: "form-card", children: _jsx(SourceSelector, { sources: catalog.sources, selected: form.sources, selectedTopics: form.topics, onToggle: handleSourceToggle }) }), _jsx("section", { className: "form-card", children: _jsx(SchedulePicker, { primary: form.delivery.primary, secondary: form.delivery.secondary, onChange: handleScheduleChange }) }), _jsx("section", { className: "form-card", children: _jsx(DispatchChooser, { method: form.dispatchMethod, token: form.githubToken, onMethodChange: (method) => setForm({ ...form, dispatchMethod: method }), onTokenChange: (token) => setForm({ ...form, githubToken: token }) }) }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { type: "submit", className: "primary", children: "Submit to GitHub" }), _jsx("button", { type: "button", onClick: resetForm, className: "secondary", children: "Reset form" })] }), _jsx(FeedbackBanner, { status: status, message: statusMessage })] }), _jsxs("aside", { className: "sidebar", children: [_jsx(SubmissionSummary, { form: {
                                    ...form,
                                    topics: displayTopics,
                                    sources: displaySources
                                } }), _jsx(PrivacyNotice, {})] })] }), _jsx("footer", { className: "footer", children: "Built for Reuters business desk \u2022 All automation runs through GitHub Actions \u2022 Need help? Ping #news-automation" })] }));
};
export default App;
