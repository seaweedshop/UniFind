import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClaimModal from '../components/ClaimModal/ClaimModal';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { createOrOpenConversation } from '../services/conversationService';
import { fetchItem, getItemImageUrl } from '../services/itemService';
import { submitClaim } from '../services/claimService';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [claimSummary, setClaimSummary] = useState({ pendingClaims: 0, recoveryStatus: 'Active' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [claimOpen, setClaimOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadItem = async () => {
      try {
        const response = await fetchItem(id);

        if (cancelled) return;

        setItem(response.item || null);
        setClaimSummary(response.claim_summary || { pendingClaims: 0, recoveryStatus: 'Active' });
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError?.response?.data?.message || 'Could not load this item right now.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadItem();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const recoveryStatus = item?.resolved
    ? 'Resolved'
    : claimSummary.itemStatus || 'Active';

  const isClaimable = Boolean(
    user &&
      item &&
      ['lost', 'found'].includes(item.item_type) &&
      item.user_id !== user.id &&
      recoveryStatus !== 'Resolved'
  );

  const isOwnItem = Boolean(user && item && item.user_id === user.id);
  const isResolved = recoveryStatus === 'Resolved';
  const isConversationCreatable = Boolean(user && item && !isOwnItem && !isResolved);

  const messageActionLabel = item?.item_type === 'sell'
    ? 'Message Seller'
    : item?.item_type === 'found'
      ? 'Contact Finder'
      : 'Contact Owner';

  const closedConversationMessage = item?.item_type === 'sell'
    ? 'This item has been sold.'
    : 'This item has already been resolved.';

  const handleClaimSubmit = async (payload) => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await submitClaim(payload);
      setMessage(response.message || 'Your claim has been submitted successfully.');
      setClaimOpen(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not submit the claim.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartConversation = async () => {
    if (!item || !user || isOwnItem || !isConversationCreatable) {
      return;
    }

    setStartingConversation(true);
    setError('');

    try {
      const response = await createOrOpenConversation({
        item_id: item.id,
        recipient_id: item.user_id,
      });

      const conversationId = response?.conversation?.id;

      if (!conversationId) {
        throw new Error('Conversation could not be opened.');
      }

      navigate(`/messages?conversation=${conversationId}`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Could not open conversation.');
    } finally {
      setStartingConversation(false);
    }
  };

  if (loading) {
    return <Loader label="Loading item details..." />;
  }

  if (error && !item) {
    return <div className="form-alert">{error}</div>;
  }

  if (!item) {
    return null;
  }

  const imageUrl = getItemImageUrl(item.image_url || item.image);

  return (
    <section className="page-card item-detail-page">
      <button className="btn btn-secondary item-detail-back" type="button" onClick={() => navigate(-1)}>
        Back
      </button>

      {message ? <div className="success-alert">{message}</div> : null}
      {error ? <div className="form-alert">{error}</div> : null}

      <div className="item-detail-layout">
        <div className="item-detail-media">
          {imageUrl ? <img src={imageUrl} alt={item.title} /> : <div className="item-image-placeholder">No image</div>}
        </div>

        <div className="item-detail-content">
          <div className="listing-topline">
            <StatusBadge status={item.item_status || item.status_label} itemType={item.item_type} />
            <span className="listing-meta-type">{item.item_type}</span>
            <span className="listing-meta-type listing-meta-category">{item.category}</span>
          </div>

          <h1>{item.title}</h1>
          <p className="muted">{item.description}</p>

          <div className="detail-status-panel">
            <span className="muted">Workflow status</span>
            <strong>{recoveryStatus}</strong>
            {recoveryStatus === 'Resolved' ? <p>This item has already been recovered.</p> : null}
            {recoveryStatus === 'Under Claim Review' ? <p>Owner is currently reviewing another claim.</p> : null}
            {item.item_type === 'sell' ? <p>Marketplace listings do not use the claim workflow.</p> : null}
          </div>

          <dl className="item-meta detail-meta-grid">
            <div>
              <dt>Location</dt>
              <dd>{item.location}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(item.date)}</dd>
            </div>
            <div>
              <dt>Posted by</dt>
              <dd>{item.user_id === user?.id ? 'You' : 'Another student'}</dd>
            </div>
            {item.item_type === 'sell' ? (
              <>
                <div>
                  <dt>Price</dt>
                  <dd>{item.price !== null && item.price !== undefined ? `₹${item.price}` : 'N/A'}</dd>
                </div>
                <div>
                  <dt>Condition</dt>
                  <dd>{item.condition_status || 'N/A'}</dd>
                </div>
              </>
            ) : null}
          </dl>

          {isClaimable ? (
            <button className="btn item-detail-claim-btn" type="button" onClick={() => setClaimOpen(true)}>
              Claim This Item
            </button>
          ) : null}

          {isConversationCreatable ? (
            <button className="btn btn-secondary item-detail-message-btn" type="button" onClick={handleStartConversation} disabled={startingConversation}>
              {startingConversation ? 'Opening chat...' : messageActionLabel}
            </button>
          ) : null}

          {!isOwnItem && isResolved ? <p className="muted">{closedConversationMessage}</p> : null}
        </div>
      </div>

      <ClaimModal open={claimOpen} item={item} loading={saving} onClose={() => setClaimOpen(false)} onSubmit={handleClaimSubmit} />
    </section>
  );
};

export default ItemDetail;