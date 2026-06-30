import ItemForm from './ItemForm';

const EditItemModal = ({ open, item, onClose, onSubmit, loading = false }) => {
  if (!open || !item) {
    return null;
  }

  return (
    <div className="dialog-overlay">
      <div className="modal-card page-card">
        <div className="section-header modal-header">
          <div>
            <h2>Edit Listing</h2>
            <p className="muted">Update your listing details and status.</p>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <ItemForm
          initialValues={item}
          onSubmit={onSubmit}
          loading={loading}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
};

export default EditItemModal;
