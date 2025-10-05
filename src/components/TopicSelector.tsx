import type { Topic } from '../types';

interface TopicSelectorProps {
  topics: Topic[];
  selected: string[];
  onToggle: (id: string) => void;
}

const TopicSelector = ({ topics, selected, onToggle }: TopicSelectorProps) => {
  return (
    <div>
      <h3>Focus areas</h3>
      <p>Select the beats you want covered in each roundup.</p>
      <div className="chip-grid">
        {topics.map((topic) => {
          const isSelected = selected.includes(topic.id);
          return (
            <button
              key={topic.id}
              type="button"
              className={`chip ${isSelected ? 'chip--selected' : ''}`}
              onClick={() => onToggle(topic.id)}
              aria-pressed={isSelected}
            >
              <span className="chip__label">{topic.label}</span>
              <span className="chip__hint">{topic.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TopicSelector;
