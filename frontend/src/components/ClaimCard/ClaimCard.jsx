import { useNavigate } from 'react-router-dom';
import ClaimStatusBadge from '../ClaimStatusBadge/ClaimStatusBadge';
import { getItemImageUrl } from '../../services/itemService';
import ImageWithFallback from '../ImageWithFallback';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

const statusMessageByStatus = {
  pending: 'Waiting for owner review.',
  accepted: 'Your claim has been accepted. Please coordinate with the owner to verify and collect the item.',
  'on hold': 'The owner is currently verifying another claim. Your claim is still active.',
  rejected: 'Your claim was rejected.',
  expired: 'The accepted claim could not be completed in time. This claim has expired.',
};

const ClaimCard = ({ claim, variant = 'incoming', loading = false, onAccept, onReject }) => {
  const navigate = useNavigate();
  const imageUrl = getItemImageUrl(claim.item_image);
  const isIncoming = variant === 'incoming';
  const canReview = isIncoming && ['Pending', 'On Hold'].includes(claim.status);
  const statusMessage = statusMessageByStatus[(claim.status || 'pending').toString().trim().toLowerCase()];

  return (
    <article className="claim-card">
      {variant === 'my' ? (
        <div className="claim-card-image">
          <ImageWithFallback src={imageUrl} alt={claim.item_title} />
        </div>
      ) : null}

      <div className="claim-card-body">
        <div className="listing-topline">
          <ClaimStatusBadge status={claim.status} />
          <span className="listing-meta-type">{claim.item_type}</span>
          <span className="listing-meta-type listing-meta-category">{claim.item_title}</span>
        </div>

        <h3>{isIncoming ? claim.claimer_name : claim.item_title}</h3>
        <p className="muted claim-subtitle">
          {isIncoming ? `Claim for ${claim.item_title}` : `Owner: ${claim.owner_name || 'N/A'}`}
        </p>
        {statusMessage ? <p className="claim-status-message muted">{statusMessage}</p> : null}

        <dl className="listing-meta-grid claim-meta-grid">
          {isIncoming ? (
            <>
              <div>
                <dt>Claimant</dt>
                <dd>{claim.claimer_name || 'N/A'}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatDate(claim.created_at)}</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Owner</dt>
                <dd>{claim.owner_name || 'N/A'}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatDate(claim.created_at)}</dd>
              </div>
            </>
          )}
        </dl>

        <div className="claim-proof">
          <strong>Proof description</strong>
          <p className="muted">{claim.proof_description}</p>
          {claim.contact_note ? (
            <p className="muted claim-note">
              <strong>Contact note:</strong> {claim.contact_note}
            </p>
          ) : null}
        </div>

        <div className="item-card-actions">
          {isIncoming ? (
            <>
              <button className="btn btn-secondary" onClick={() => navigate(`/claims/${claim.id}`)}>
                View Details
              </button>
              <button className="btn btn-secondary" onClick={() => onReject?.(claim)} disabled={loading || !canReview}>
                Reject
              </button>
              <button className="btn" onClick={() => onAccept?.(claim)} disabled={loading || !canReview}>
                Accept
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => navigate(`/claims/${claim.id}`)}>
                View Details
              </button>
              <button className="btn btn-secondary" onClick={() => navigate(`/items/${claim.item_id}`)}>
                View Item
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default ClaimCard;