import { useEffect, useState } from 'react';
import { ITEM_CATEGORIES } from '../constants/itemCategories';

const emptyState = {
  title: '',
  description: '',
  category: '',
  item_type: 'lost',
  location: '',
  date: '',
  price: '',
  condition_status: '',
  resolved: false,
};

const ItemForm = ({ initialValues, onSubmit, loading = false, submitLabel = 'Save Item' }) => {
  const [formData, setFormData] = useState(emptyState);
  const [imageFile, setImageFile] = useState(null);
  const categoryOptions = [
    ...ITEM_CATEGORIES,
    ...(initialValues?.category && !ITEM_CATEGORIES.includes(initialValues.category) ? [initialValues.category] : []),
  ];

  useEffect(() => {
    if (initialValues) {
      setFormData({
        title: initialValues.title || '',
        description: initialValues.description || '',
        category: initialValues.category || '',
        item_type: initialValues.item_type || 'lost',
        location: initialValues.location || '',
        date: initialValues.date ? String(initialValues.date).slice(0, 10) : '',
        price: initialValues.price ?? '',
        condition_status: initialValues.condition_status || '',
        resolved: Boolean(initialValues.resolved),
      });
    }
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({ ...formData, imageFile });
  };

  const isMarketplace = formData.item_type === 'sell';

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      <label className="form-group">
        <span>Item Type</span>
        <select name="item_type" value={formData.item_type} onChange={handleChange}>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
          <option value="sell">Sell / Marketplace</option>
        </select>
      </label>

      <label className="form-group">
        <span>Title</span>
        <input name="title" value={formData.title} onChange={handleChange} required />
      </label>

      <label className="form-group">
        <span>Description</span>
        <textarea name="description" value={formData.description} onChange={handleChange} rows="4" required />
      </label>

      <label className="form-group">
        <span>Category</span>
        <select name="category" value={formData.category} onChange={handleChange} required>
          <option value="">Select category</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="form-group">
        <span>Image</span>
        <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
      </label>

      <label className="form-group">
        <span>Location</span>
        <input name="location" value={formData.location} onChange={handleChange} required />
      </label>

      <label className="form-group">
        <span>Date</span>
        <input type="date" name="date" value={formData.date} onChange={handleChange} required />
      </label>

      {isMarketplace ? (
        <>
          <label className="form-group">
            <span>Price</span>
            <input type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleChange} />
          </label>

          <label className="form-group">
            <span>Condition Status</span>
            <input name="condition_status" value={formData.condition_status} onChange={handleChange} />
          </label>
        </>
      ) : null}

      <label className="form-group checkbox-group">
        <span>Resolved / Sold</span>
        <div className="checkbox-row">
          <input
            type="checkbox"
            name="resolved"
            checked={Boolean(formData.resolved)}
            onChange={(event) =>
              setFormData((current) => ({ ...current, resolved: event.target.checked }))
            }
          />
          <span>{isMarketplace ? 'Mark as sold' : 'Mark as resolved'}</span>
        </div>
      </label>

      <button className="btn auth-btn" type="submit" disabled={loading}>
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
};

export default ItemForm;
