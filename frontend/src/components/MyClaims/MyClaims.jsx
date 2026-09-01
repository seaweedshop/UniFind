import { useEffect, useState } from 'react';
import ClaimCard from '../ClaimCard/ClaimCard';
import EmptyState from '../EmptyState';
import Loader from '../Loader';
import { fetchMyClaims } from '../../services/claimService';

const MyClaims = ({ compact = false }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadClaims = async () => {
    try {
      const response = await fetchMyClaims();
      setClaims(response.claims || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to load your claims.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const acceptedCount = claims.filter((claim) => claim.status === 'Accepted').length;
  const rejectedCount = claims.filter((claim) => claim.status === 'Rejected').length;
  const statusMessage = acceptedCount > 0 ? 'Your claim has been accepted.' : rejectedCount > 0 ? 'Your claim was not approved.' : '';

  const visibleClaims = compact ? claims.slice(0, 3) : claims;

  return (
    <section className="page-card claim-section">
      <div className="section-header">
        <h2>My Claims</h2>
        <p className="muted">Track the ownership requests you have submitted.</p>
      </div>

      {statusMessage ? <div className={acceptedCount > 0 ? 'success-alert' : 'form-alert'}>{statusMessage}</div> : null}
      {error ? <div className="form-alert">{error}</div> : null}
      {loading ? <Loader label="Loading your claims..." /> : null}

      {!loading && !error ? (
        visibleClaims.length > 0 ? (
          <div className="claims-grid">
            {visibleClaims.map((claim) => (
              <ClaimCard key={claim.id} claim={claim} variant="my" />
            ))}
          </div>
        ) : (
          <EmptyState
            title="You have not submitted any claims yet."
            description="Use the Claim This Item button on a lost or found item to start a request."
          />
        )
      ) : null}
    </section>
  );
};

export default MyClaims;