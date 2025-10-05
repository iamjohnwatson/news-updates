import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const matchesTopics = (source, topics) => {
    if (!topics.length) {
        return true;
    }
    return topics.some((topic) => source.supportsTopics.includes(topic));
};
const SourceSelector = ({ sources, selected, selectedTopics, onToggle }) => {
    return (_jsxs("div", { children: [_jsx("h3", { children: "Source roster" }), _jsx("p", { children: "Pick competitor desks to monitor. Highlighted sources align with chosen beats." }), _jsx("div", { className: "source-grid", children: sources.map((source) => {
                    const isSelected = selected.includes(source.id);
                    const topicAligned = matchesTopics(source, selectedTopics);
                    return (_jsxs("label", { className: `source-card ${topicAligned ? 'source-card--aligned' : ''} ${isSelected ? 'source-card--selected' : ''}`, children: [_jsx("input", { type: "checkbox", name: "sources", value: source.id, checked: isSelected, onChange: () => onToggle(source.id) }), _jsxs("div", { className: "source-card__body", children: [_jsxs("div", { className: "source-card__heading", children: [_jsx("span", { children: source.name }), _jsxs("span", { className: "source-card__badge", children: [source.supportsTopics.length, " beats"] })] }), _jsx("p", { className: "source-card__notes", children: source.notes ?? 'No ingest notes provided.' }), _jsx("a", { href: source.homepage, target: "_blank", rel: "noopener noreferrer", children: "Visit site \u2197" })] })] }, source.id));
                }) })] }));
};
export default SourceSelector;
