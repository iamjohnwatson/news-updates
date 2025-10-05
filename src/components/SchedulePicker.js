import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const SchedulePicker = ({ primary, secondary, onChange }) => {
    return (_jsxs("div", { children: [_jsx("h3", { children: "Delivery cadence" }), _jsx("p", { children: "Choose up to two send times per day (24h format)." }), _jsxs("div", { className: "schedule-grid", children: [_jsxs("label", { children: [_jsx("span", { children: "Primary send" }), _jsx("input", { type: "time", value: primary, onChange: (event) => onChange('primary', event.target.value), required: true })] }), _jsxs("label", { children: [_jsx("span", { children: "Optional second burst" }), _jsx("input", { type: "time", value: secondary ?? '', onChange: (event) => onChange('secondary', event.target.value) })] })] })] }));
};
export default SchedulePicker;
