import { useEffect, useState } from 'react';

const MIN_PROOF_LENGTH = 20;

const ClaimModal = ({ open, item, loading = false, onClose, onSubmit }) => {
  const [proofDescription, setProofDescription] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setProofDescription('');
      setContactNote('');
      setFormError('');
    }
  }, [open]);

  if (!open || !item) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (proofDescription.trim().length < MIN_PROOF_LENGTH) {
      setFormError(`Please share at least ${MIN_PROOF_LENGTH} characters of proof details.`);
      return;
    }

    setFormError('');
    await onSubmit({
      item_id: item.id,
      proof_description: proofDescription.trim(),
      contact_note: contactNote.trim(),
    });
  };

  return (
    <div className="dialog-overlay">
      <div className="modal-card page-card claim-modal-card">
        <div className="section-header modal-header">
          <div>
            <h2>Claim This Item</h2>
            <p className="muted">Share ownership details that only the real owner would know.</p>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="claim-modal-item">
          <strong>{item.title}</strong>
          <p className="muted">{item.location}</p>
        </div>

        {formError ? <div className="form-alert">{formError}</div> : null}

        <form className="item-form" onSubmit={handleSubmit}>
          <label className="form-group">
            <span>Proof of ownership description</span>
            <textarea
              rows="5"
              value={proofDescription}
              onChange={(event) => setProofDescription(event.target.value)}
              placeholder="Examples: wallet colour, hidden contents, identifying marks, approximate date lost"
              required
            />
          </label>

          <label className="form-group">
            <span>Optional contact note</span>
            <textarea
              rows="3"
              value={contactNote}
              onChange={(event) => setContactNote(event.target.value)}
              placeholder="Add any short note for the owner"
            />
          </label>

          <button className="btn auth-btn" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClaimModal;