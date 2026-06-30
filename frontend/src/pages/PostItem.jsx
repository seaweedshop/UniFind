import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import ItemForm from '../components/ItemForm';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { createItem, fetchItem, updateItem } from '../services/itemService';

const PostItem = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [existingItem, setExistingItem] = useState(null);
  const [loading, setLoading] = useState(Boolean(editId));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadItem = async () => {
      if (!editId) return;

      try {
        const response = await fetchItem(editId);
        setExistingItem(response.item);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load item for editing.');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [editId]);

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async ({ imageFile, ...fields }) => {
    setError('');
    setSuccess('');

    const payload = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== '' && value !== null && typeof value !== 'undefined') {
        payload.append(key, value);
      }
    });

    if (imageFile) {
      payload.append('image', imageFile);
    }

    try {
      if (editId) {
        await updateItem(editId, payload);
        setSuccess('Item updated successfully.');
      } else {
        await createItem(payload);
        setSuccess('Item posted successfully.');
      }

      navigate('/account');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save the item. Please try again.');
    }
  };

  return (
    <section className="page-card">
      <div className="section-header">
        <h1>{editId ? 'Edit Item' : 'Post Item'}</h1>
        <p className="muted">Create a lost, found, or marketplace listing.</p>
      </div>

      {loading ? <Loader label="Loading item..." /> : null}
      {error ? <div className="form-alert">{error}</div> : null}
      {success ? <div className="success-alert">{success}</div> : null}

      {!loading ? (
        <ItemForm
          initialValues={existingItem}
          onSubmit={handleSubmit}
          submitLabel={editId ? 'Update Item' : 'Post Item'}
        />
      ) : null}
    </section>
  );
};

export default PostItem;
