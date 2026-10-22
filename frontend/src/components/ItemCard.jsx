import { getItemImageUrl } from '../services/itemService';
import ImageWithFallback from './ImageWithFallback';
import StatusBadge from './StatusBadge';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

const ItemCard = ({
  item,
  canManage = false,
  onView,
  onEdit,
  onDelete,
  onResolve,
}) => {
  const imageUrl = getItemImageUrl(item.image_url || item.image);
  const itemStatus = item.item_status || item.status_label || 'Active';
  const cardClassName = `item-card ${itemStatus === 'Under Claim Review' ? 'item-card-under-review' : ''} ${itemStatus === 'Resolved' ? 'item-card-resolved' : ''}`.trim();

  return (
    <article className={cardClassName}>
      <div className="item-card-image">
        <ImageWithFallback src={imageUrl} alt={item.title} />
      </div>

      <div className="item-card-body">
        <div className="item-card-topline">
          <span className="badge">{item.item_type}</span>
          <span className="badge badge-muted">{item.category}</span>
          <StatusBadge status={item.item_status || item.status_label} itemType={item.item_type} />
        </div>

        <h3 title={item.title}>{item.title}</h3>
        <p className="muted item-description">{item.description}</p>

        <dl className="item-meta">
          <div>
            <dt>Category</dt>
            <dd>{item.category}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{item.location}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatDate(item.date)}</dd>
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

        {canManage ? (
          <div className="item-card-actions">
            <button type="button" className="btn btn-secondary" onClick={() => onEdit(item)}>Edit</button>
            <button type="button" className="btn btn-secondary" onClick={() => onDelete(item.id)}>Delete</button>
            <button type="button" className="btn" onClick={() => onResolve(item.id)}>
              Mark Item as Resolved
            </button>
          </div>
        ) : onView ? (
          <div className="item-card-actions">
            <button type="button" className="btn btn-secondary" onClick={() => onView(item)}>
              View Details
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default ItemCard;
