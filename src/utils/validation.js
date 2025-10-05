const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/;
export const validateForm = (form) => {
    const errors = [];
    if (!emailPattern.test(form.email.trim())) {
        errors.push('Enter a valid email address.');
    }
    if (!timePattern.test(form.delivery.primary)) {
        errors.push('Primary delivery time must be in 24h HH:MM format.');
    }
    if (form.delivery.secondary && !timePattern.test(form.delivery.secondary)) {
        errors.push('Secondary delivery time must be in 24h HH:MM format.');
    }
    if (!form.topics.length) {
        errors.push('Select at least one topic.');
    }
    if (!form.sources.length) {
        errors.push('Select at least one source.');
    }
    if (form.dispatchMethod === 'workflow_dispatch' && !form.githubToken?.trim()) {
        errors.push('Provide a GitHub token or switch to issue-based submission.');
    }
    return errors;
};
export const normaliseTime = (value) => value.trim();
