import type { Source } from '../types';

interface SourceSelectorProps {
  sources: Source[];
  selected: string[];
  selectedTopics: string[];
  onToggle: (id: string) => void;
}

const matchesTopics = (source: Source, topics: string[]) => {
  if (!topics.length) {
    return true;
  }

  return topics.some((topic) => source.supportsTopics.includes(topic));
};

const SourceSelector = ({ sources, selected, selectedTopics, onToggle }: SourceSelectorProps) => {
  return (
    <div>
      <h3>Source roster</h3>
      <p>Pick competitor desks to monitor. Highlighted sources align with chosen beats.</p>
      <div className="source-grid">
        {sources.map((source) => {
          const isSelected = selected.includes(source.id);
          const topicAligned = matchesTopics(source, selectedTopics);

          return (
            <label
              key={source.id}
              className={`source-card ${topicAligned ? 'source-card--aligned' : ''} ${
                isSelected ? 'source-card--selected' : ''
              }`}
            >
              <input
                type="checkbox"
                name="sources"
                value={source.id}
                checked={isSelected}
                onChange={() => onToggle(source.id)}
              />
              <div className="source-card__body">
                <div className="source-card__heading">
                  <span>{source.name}</span>
                  <span className="source-card__badge">{source.supportsTopics.length} beats</span>
                </div>
                <p className="source-card__notes">{source.notes ?? 'No ingest notes provided.'}</p>
                <a href={source.homepage} target="_blank" rel="noopener noreferrer">
                  Visit site ↗
                </a>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default SourceSelector;
