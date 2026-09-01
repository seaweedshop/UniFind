import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../EmptyState';
import Loader from '../Loader';
import ClaimCard from '../ClaimCard/ClaimCard';
import { acceptClaim, fetchIncomingClaims, rejectClaim } from '../../services/claimService';

const IncomingClaims = ({ compact = false }) => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadClaims = async () => {
    try {
      const response = await fetchIncomingClaims();
      setClaims(response.claims || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to load incoming claims.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleAccept = async (claim) => {
    setActionLoadingId(claim.id);
    setError('');
    setMessage('');

    try {
      const response = await acceptClaim(claim.id);
      setMessage(response.message || 'Item marked as recovered.');
      await loadClaims();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not accept the claim.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (claim) => {
    setActionLoadingId(claim.id);
    setError('');
    setMessage('');

    try {
      const response = await rejectClaim(claim.id);
      setMessage(response.message || 'Your claim was not approved.');
      await loadClaims();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not reject the claim.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const visibleClaims = compact ? claims.slice(0, 3) : claims;

  return (
    <section className="page-card claim-section">
      <div className="section-header section-header-row">
        <div>
          <h2>Incoming Claims</h2>
          <p className="muted">Review ownership requests on your lost and found listings.</p>
        </div>
        {compact && claims.length > visibleClaims.length ? (
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/claims/incoming')}>
            View All
          </button>
        ) : null}
      </div>

      {message ? <div className="success-alert">{message}</div> : null}
      {error ? <div className="form-alert">{error}</div> : null}
      {loading ? <Loader label="Loading incoming claims..." /> : null}

      {!loading && !error ? (
        visibleClaims.length > 0 ? (
          <div className="claims-grid">
            {visibleClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                variant="incoming"
                loading={actionLoadingId === claim.id}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No incoming claims yet."
            description="When students submit ownership requests, they will appear here."
          />
        )
      ) : null}
    </section>
  );
};

export default IncomingClaims;