import { getItemImageUrl } from '../services/itemService';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

const ItemCard = ({
  item,
  canManage = false,
  onEdit,
  onDelete,
  onResolve,
}) => {
  const imageUrl = getItemImageUrl(item.image_url || item.image);

  return (
    <article className="item-card">
      <div className="item-card-image">
        {imageUrl ? <img src={imageUrl} alt={item.title} /> : <div className="item-image-placeholder">No image</div>}
      </div>

      <div className="item-card-body">
        <div className="item-card-topline">
          <span className="badge">{item.item_type}</span>
          <span className="badge badge-muted">{item.category}</span>
          {item.status_label && item.status_label !== 'Active' ? <span className="badge badge-muted">{item.status_label}</span> : null}
        </div>

        <h3>{item.title}</h3>
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
            <button className="btn btn-secondary" onClick={() => onEdit(item)}>Edit</button>
            <button className="btn btn-secondary" onClick={() => onDelete(item.id)}>Delete</button>
            <button className="btn" onClick={() => onResolve(item.id)}>
              {item.item_type === 'sell' ? 'Mark Sold' : 'Mark Resolved'}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default ItemCard;
