interface FeedbackBannerProps {
  status: 'idle' | 'success' | 'error' | 'working';
  message?: string;
}

const FeedbackBanner = ({ status, message }: FeedbackBannerProps) => {
  if (status === 'idle') {
    return null;
  }

  const statusLabel =
    status === 'success' ? 'Success' : status === 'error' ? 'Check configuration' : 'Processing request';

  return (
    <div className={`feedback feedback--${status}`} role="status">
      <strong>{statusLabel}:</strong> <span>{message}</span>
    </div>
  );
};

export default FeedbackBanner;
