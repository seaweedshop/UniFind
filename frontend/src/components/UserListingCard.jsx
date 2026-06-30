import { getItemImageUrl } from '../services/itemService';
import StatusBadge from './StatusBadge';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

const UserListingCard = ({ item, onEdit, onDelete, onMarkStatus }) => {
  const imageUrl = getItemImageUrl(item.image_url || item.image);
  const canMarkComplete = item.status_label === 'Active';
  const markLabel = item.item_type === 'sell' ? 'Mark Sold' : 'Mark Resolved';

  return (
    <article className="user-listing-card">
      <div className="user-listing-image">
        {imageUrl ? <img src={imageUrl} alt={item.title} /> : <div className="item-image-placeholder">No image</div>}
      </div>

      <div className="user-listing-body">
        <div className="listing-topline">
          <StatusBadge status={item.status_label} />
          <span className="listing-meta-type">{item.item_type}</span>
          <span className="listing-meta-type listing-meta-category">{item.category}</span>
        </div>

        <h3>{item.title}</h3>
        <p className="muted listing-category">{item.category}</p>

        <dl className="listing-meta-grid">
          <div>
            <dt>Location</dt>
            <dd>{item.location}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(item.created_at)}</dd>
          </div>
          <div>
            <dt>Resolved</dt>
            <dd>{item.resolved ? 'Yes' : 'No'}</dd>
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

        <div className="item-card-actions">
          <button className="btn btn-secondary" onClick={() => onEdit(item)}>
            Edit
          </button>
          <button className="btn btn-secondary" onClick={() => onDelete(item)}>
            Delete
          </button>
          <button className="btn" onClick={() => onMarkStatus(item)} disabled={!canMarkComplete}>
            {canMarkComplete ? markLabel : 'Completed'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default UserListingCard;
