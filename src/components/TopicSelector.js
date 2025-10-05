import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const TopicSelector = ({ topics, selected, onToggle }) => {
    return (_jsxs("div", { children: [_jsx("h3", { children: "Focus areas" }), _jsx("p", { children: "Select the beats you want covered in each roundup." }), _jsx("div", { className: "chip-grid", children: topics.map((topic) => {
                    const isSelected = selected.includes(topic.id);
                    return (_jsxs("button", { type: "button", className: `chip ${isSelected ? 'chip--selected' : ''}`, onClick: () => onToggle(topic.id), "aria-pressed": isSelected, children: [_jsx("span", { className: "chip__label", children: topic.label }), _jsx("span", { className: "chip__hint", children: topic.description })] }, topic.id));
                }) })] }));
};
export default TopicSelector;
