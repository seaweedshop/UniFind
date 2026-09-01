import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClaimStatusBadge from '../components/ClaimStatusBadge/ClaimStatusBadge';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { acceptClaim, fetchClaimDetail, rejectClaim } from '../services/claimService';
import { getItemImageUrl } from '../services/itemService';

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

const timelineSteps = [
  { key: 'created_at', label: 'Submitted' },
  { key: 'accepted_at', label: 'Accepted' },
  { key: 'on_hold_at', label: 'On Hold' },
  { key: 'rejected_at', label: 'Rejected' },
  { key: 'expired_at', label: 'Expired' },
];

const ClaimDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadClaim = async () => {
      try {
        const response = await fetchClaimDetail(id);
        if (cancelled) return;
        setClaim(response.claim || null);
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError?.response?.data?.message || 'Could not load this claim right now.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadClaim();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const isOwner = claim && claim.owner_id === user?.id;
  const canReview = isOwner && ['Pending', 'On Hold'].includes(claim?.status);
  const imageUrl = useMemo(() => getItemImageUrl(claim?.item_image), [claim?.item_image]);

  const handleAccept = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await acceptClaim(claim.id);
      setMessage(response.message || 'Item marked as under claim review.');
      const refreshed = await fetchClaimDetail(id);
      setClaim(refreshed.claim || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not accept the claim.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await rejectClaim(claim.id);
      setMessage(response.message || 'Your claim was not approved.');
      const refreshed = await fetchClaimDetail(id);
      setClaim(refreshed.claim || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not reject the claim.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader label="Loading claim details..." />;
  }

  if (error && !claim) {
    return <div className="form-alert">{error}</div>;
  }

  if (!claim) {
    return null;
  }

  const statusMessageMap = {
    pending: 'Waiting for owner review.',
    accepted: 'Your claim has been accepted. Please coordinate with the owner to verify and collect the item.',
    'on hold': 'The owner is currently verifying another claim. Your claim is still active.',
    rejected: 'Your claim was rejected.',
    expired: 'The accepted claim could not be completed in time. This claim has expired.',
  };

  return (
    <section className="page-card claim-detail-page">
      <button className="btn btn-secondary item-detail-back" type="button" onClick={() => navigate(-1)}>
        Back
      </button>

      {message ? <div className="success-alert">{message}</div> : null}
      {error ? <div className="form-alert">{error}</div> : null}

      <div className="claim-detail-layout">
        <div className="claim-detail-media">
          {imageUrl ? <img src={imageUrl} alt={claim.item_title} /> : <div className="item-image-placeholder">No image</div>}
        </div>

        <div className="claim-detail-content">
          <div className="listing-topline">
            <ClaimStatusBadge status={claim.status} />
            <span className="listing-meta-type">{claim.item_type}</span>
            <span className="listing-meta-type listing-meta-category">{claim.item_title}</span>
          </div>

          <h1>{claim.item_title}</h1>
          <p className="muted">{statusMessageMap[(claim.status || 'pending').toString().toLowerCase()]}</p>

          <dl className="item-meta detail-meta-grid">
            <div>
              <dt>Student Name</dt>
              <dd>{claim.claimer_name || 'N/A'}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{claim.owner_name || 'N/A'}</dd>
            </div>
            <div>
              <dt>Submitted Date</dt>
              <dd>{formatDateTime(claim.created_at)}</dd>
            </div>
            <div>
              <dt>Current Status</dt>
              <dd>{claim.status}</dd>
            </div>
          </dl>

          <div className="detail-status-panel">
            <span className="muted">Proof of Ownership</span>
            <p>{claim.proof_description}</p>
            {claim.contact_note ? <p className="muted"><strong>Contact Note:</strong> {claim.contact_note}</p> : null}
          </div>

          <div className="claim-timeline">
            <h3>Claim Timeline</h3>
            {timelineSteps.map((step) => (
              <div key={step.key} className={`timeline-step ${claim[step.key] ? 'timeline-step-complete' : ''}`}>
                <strong>{step.label}</strong>
                <span>{formatDateTime(claim[step.key])}</span>
              </div>
            ))}
          </div>

          {canReview ? (
            <div className="item-card-actions">
              <button className="btn btn-secondary" onClick={handleReject} disabled={saving}>
                Reject
              </button>
              <button className="btn" onClick={handleAccept} disabled={saving}>
                Accept
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ClaimDetail;