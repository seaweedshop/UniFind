import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import EditItemModal from '../components/EditItemModal';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import UserListingCard from '../components/UserListingCard';
import { useAuth } from '../context/AuthContext';
import { deleteItem, fetchUserListings, updateItem, updateItemStatus } from '../services/itemService';

const tabs = [
  { key: 'lost', label: 'Lost Items' },
  { key: 'found', label: 'Found Items' },
  { key: 'sell', label: 'Marketplace Listings' },
];

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

const sortUnresolvedFirst = (items = []) =>
  [...items].sort((a, b) => {
    if (a.resolved === b.resolved) {
      return new Date(b.created_at) - new Date(a.created_at);
    }

    return a.resolved ? 1 : -1;
  });

const Account = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState({ lost: [], found: [], sell: [] });
  const [activeTab, setActiveTab] = useState('lost');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadListings = async () => {
    try {
      const response = await fetchUserListings();
      const groupedListings = response.listings || { lost: [], found: [], sell: [] };

      setListings({
        lost: sortUnresolvedFirst(groupedListings.lost),
        found: sortUnresolvedFirst(groupedListings.found),
        sell: sortUnresolvedFirst(groupedListings.sell),
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load your listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const activeItems = useMemo(() => sortUnresolvedFirst(listings[activeTab] || []), [listings, activeTab]);

  const clearMessages = () => {
    setError('');
    setActionError('');
    setActionMessage('');
  };

  const handleEdit = (item) => {
    clearMessages();
    setEditingItem(item);
  };

  const handleDeleteRequest = (item) => {
    clearMessages();
    setDeleteTarget(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      await deleteItem(deleteTarget.id);
      setActionMessage('Listing deleted successfully.');
      await loadListings();
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not delete the listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async ({ imageFile, ...fields }) => {
    if (!editingItem) return;

    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      const payload = new FormData();

      Object.entries(fields).forEach(([key, value]) => {
        if (typeof value !== 'undefined' && value !== null && value !== '') {
          payload.append(key, key === 'resolved' ? String(Boolean(value)) : value);
        }
      });

      if (imageFile) {
        payload.append('image', imageFile);
      }

      await updateItem(editingItem.id, payload);
      setActionMessage('Listing updated successfully.');
      setEditingItem(null);
      await loadListings();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not update the listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkStatus = async (item) => {
    setSaving(true);
    setActionError('');
    setActionMessage('');

    try {
      await updateItemStatus(item.id, true);
      setActionMessage(item.item_type === 'sell' ? 'Listing marked as sold.' : 'Listing marked as resolved.');
      await loadListings();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not update the listing status.');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = listings[activeTab]?.length || 0;

  return (
    <section className="page-card account-page">
      <div className="section-header">
        <h1>Your Account</h1>
        <p className="muted">Manage your profile and listings from one place.</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">{user?.full_name?.slice(0, 1)?.toUpperCase() || 'S'}</div>
        <div className="profile-details">
          <div className="profile-grid">
            <div>
              <span>Full name</span>
              <strong>{user?.full_name || 'N/A'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{user?.email || 'N/A'}</strong>
            </div>
            <div>
              <span>Department</span>
              <strong>{user?.department || 'N/A'}</strong>
            </div>
            <div>
              <span>Year / Semester</span>
              <strong>{user?.year || 'N/A'}</strong>
            </div>
            <div>
              <span>Account created</span>
              <strong>{formatDate(user?.created_at)}</strong>
            </div>
          </div>

          <button className="btn btn-secondary" type="button">
            Edit Profile
          </button>
        </div>
      </div>

      <div className="listing-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} <span>{listings[tab.key]?.length || 0}</span>
          </button>
        ))}
      </div>

      {loading ? <Loader label="Loading your listings..." /> : null}
      {error ? <div className="form-alert">{error}</div> : null}
      {actionError ? <div className="form-alert">{actionError}</div> : null}
      {actionMessage ? <div className="success-alert">{actionMessage}</div> : null}

      {!loading ? (
        <div>
          <div className="section-header">
            <h2>{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
            <p className="muted">{activeCount} listing(s)</p>
          </div>

          {activeItems.length > 0 ? (
            <div className="items-grid">
              {activeItems.map((item) => (
                <UserListingCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                  onMarkStatus={handleMarkStatus}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={`No ${activeTab} items posted yet.`}
              description={
                activeTab === 'sell'
                  ? 'No marketplace listings have been posted yet.'
                  : activeTab === 'found'
                    ? 'No found items posted yet.'
                    : 'No lost items posted yet.'
              }
            />
          )}
        </div>
      ) : null}

      <EditItemModal
        open={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSubmit={handleSaveItem}
        loading={saving}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete listing?"
        message={`This will permanently remove \"${deleteTarget?.title || 'this item'}\" from your account.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </section>
  );
};

export default Account;