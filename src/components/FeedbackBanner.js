import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
const FeedbackBanner = ({ status, message }) => {
    if (status === 'idle') {
        return null;
    }
    const statusLabel = status === 'success' ? 'Success' : status === 'error' ? 'Check configuration' : 'Processing request';
    return (_jsxs("div", { className: `feedback feedback--${status}`, role: "status", children: [_jsxs("strong", { children: [statusLabel, ":"] }), " ", _jsx("span", { children: message })] }));
};
export default FeedbackBanner;
