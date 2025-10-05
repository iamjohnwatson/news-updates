const PrivacyNotice = () => (
  <section className="privacy-panel">
    <h3>Privacy + handling</h3>
    <ul>
      <li>Email addresses are passed into GitHub Actions and deleted after each send.</li>
      <li>No database or persistent storage — GitHub workflow logs are scrubbed of addresses.</li>
      <li>Credentials (SMTP/API keys) live only as GitHub Secrets controlled by the desk.</li>
      <li>You can revoke access any time by deleting the issue/workflow or rotating the token.</li>
    </ul>
  </section>
);

export default PrivacyNotice;
