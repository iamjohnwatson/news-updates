interface SchedulePickerProps {
  primary: string;
  secondary?: string;
  onChange: (field: 'primary' | 'secondary', value: string) => void;
}

const SchedulePicker = ({ primary, secondary, onChange }: SchedulePickerProps) => {
  return (
    <div>
      <h3>Delivery cadence</h3>
      <p>Choose up to two send times per day (24h format).</p>
      <div className="schedule-grid">
        <label>
          <span>Primary send</span>
          <input
            type="time"
            value={primary}
            onChange={(event) => onChange('primary', event.target.value)}
            required
          />
        </label>
        <label>
          <span>Optional second burst</span>
          <input
            type="time"
            value={secondary ?? ''}
            onChange={(event) => onChange('secondary', event.target.value)}
          />
        </label>
      </div>
    </div>
  );
};

export default SchedulePicker;
