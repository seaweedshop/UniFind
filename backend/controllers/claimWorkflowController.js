const { validationResult } = require('express-validator');
const { dbPool } = require('../config/db');
const { createNotification } = require('../services/notificationService');

const ITEM_STATUSES = {
  ACTIVE: 'Active',
  UNDER_REVIEW: 'Under Claim Review',
  RESOLVED: 'Resolved',
};

const CLAIM_STATUSES = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  ON_HOLD: 'On Hold',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

const VALID_CLAIM_STATUSES = new Set(Object.values(CLAIM_STATUSES));
const VALID_ITEM_TYPES = new Set(['lost', 'found']);

const queueNotification = (...args) => {
  // Notification writes are fire-and-forget so claim and resolution requests never wait on them.
  void createNotification(...args).catch((error) => {
    console.error('Notification creation failed:', error.message);
  });
};

const CLAIMS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    claimer_id INT NOT NULL,
    owner_id INT NOT NULL,
    proof_description TEXT NOT NULL,
    contact_note TEXT DEFAULT NULL,
    status ENUM('Pending', 'Accepted', 'On Hold', 'Rejected', 'Expired') DEFAULT 'Pending',
    status_note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL DEFAULT NULL,
    on_hold_at TIMESTAMP NULL DEFAULT NULL,
    rejected_at TIMESTAMP NULL DEFAULT NULL,
    expired_at TIMESTAMP NULL DEFAULT NULL,
    KEY idx_claims_item_status_created_at (item_id, status, created_at),
    KEY idx_claims_owner_status_created_at (owner_id, status, created_at),
    KEY idx_claims_claimer_created_at (claimer_id, created_at),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (claimer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

const CLAIM_COLUMNS = [
  { name: 'status_note', definition: 'TEXT DEFAULT NULL', after: 'status' },
  { name: 'accepted_at', definition: 'TIMESTAMP NULL DEFAULT NULL', after: 'created_at' },
  { name: 'on_hold_at', definition: 'TIMESTAMP NULL DEFAULT NULL', after: 'accepted_at' },
  { name: 'rejected_at', definition: 'TIMESTAMP NULL DEFAULT NULL', after: 'on_hold_at' },
  { name: 'expired_at', definition: 'TIMESTAMP NULL DEFAULT NULL', after: 'rejected_at' },
];

const normalizeClaimStatus = (status) => {
  const value = (status || CLAIM_STATUSES.PENDING).toString().trim();
  return VALID_CLAIM_STATUSES.has(value) ? value : CLAIM_STATUSES.PENDING;
};

const normalizeItemStatus = (status, resolvedFallback) => {
  const value = (status || '').toString().trim();

  if ([ITEM_STATUSES.ACTIVE, ITEM_STATUSES.UNDER_REVIEW, ITEM_STATUSES.RESOLVED].includes(value)) {
    return value;
  }

  return resolvedFallback ? ITEM_STATUSES.RESOLVED : ITEM_STATUSES.ACTIVE;
};

const getItemStatusRank = (status) => {
  if (status === ITEM_STATUSES.UNDER_REVIEW) return 1;
  if (status === ITEM_STATUSES.RESOLVED) return 2;
  return 0;
};

const claimStatusMessage = (status) => {
  switch (normalizeClaimStatus(status)) {
    case CLAIM_STATUSES.ACCEPTED:
      return 'Your claim has been accepted. Please coordinate with the owner to verify and collect the item.';
    case CLAIM_STATUSES.ON_HOLD:
      return 'The owner is currently verifying another claim. Your claim is still active.';
    case CLAIM_STATUSES.REJECTED:
      return 'Your claim was rejected.';
    case CLAIM_STATUSES.EXPIRED:
      return 'The accepted claim could not be completed in time. This claim has expired.';
    case CLAIM_STATUSES.PENDING:
    default:
      return 'Waiting for owner review.';
  }
};

const mapClaimRow = (row) => ({
  id: row.id,
  item_id: row.item_id,
  claimer_id: row.claimer_id,
  owner_id: row.owner_id,
  proof_description: row.proof_description,
  contact_note: row.contact_note,
  status: normalizeClaimStatus(row.status),
  status_note: row.status_note || null,
  created_at: row.created_at,
  accepted_at: row.accepted_at,
  on_hold_at: row.on_hold_at,
  rejected_at: row.rejected_at,
  expired_at: row.expired_at,
  item_title: row.item_title,
  item_type: row.item_type,
  item_image: row.item_image,
  item_status: row.item_status,
  item_resolved: Boolean(row.item_resolved),
  claimer_name: row.claimer_name,
  owner_name: row.owner_name,
});

const ensureClaimsSchema = async () => {
  await dbPool.execute(CLAIMS_SCHEMA_SQL);

  const [columnRows] = await dbPool.execute(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'claims'
    `,
    [process.env.DB_NAME]
  );

  const existingColumns = new Set(columnRows.map((row) => row.COLUMN_NAME));

  for (const column of CLAIM_COLUMNS) {
    if (!existingColumns.has(column.name)) {
      await dbPool.execute(`ALTER TABLE claims ADD COLUMN ${column.name} ${column.definition} AFTER ${column.after}`);
    }
  }

  await dbPool.execute(
    `ALTER TABLE claims MODIFY COLUMN status ENUM('Pending', 'Accepted', 'On Hold', 'Rejected', 'Expired') DEFAULT 'Pending'`
  );
};

const ensureItemStatusSchema = async () => {
  const [columnRows] = await dbPool.execute(
    `
      SELECT COUNT(*) AS count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'items'
        AND COLUMN_NAME = 'item_status'
    `,
    [process.env.DB_NAME]
  );

  if (!Number(columnRows[0]?.count || 0)) {
    await dbPool.execute(
      `
        ALTER TABLE items
        ADD COLUMN item_status ENUM('Active', 'Under Claim Review', 'Resolved') NOT NULL DEFAULT 'Active' AFTER item_type
      `
    );
  }

  await dbPool.execute(
    `
      UPDATE items
      SET item_status = CASE WHEN resolved = TRUE THEN 'Resolved' ELSE 'Active' END
      WHERE item_status IS NULL OR item_status = ''
    `
  );
};

const ensureWorkflowSchema = async () => {
  await ensureItemStatusSchema();
  await ensureClaimsSchema();
};

const fetchItemById = async (connection, itemId) => {
  const [rows] = await connection.execute(
    `
      SELECT id, title, description, category, item_type, image, location, date, price, condition_status, resolved, item_status, user_id, created_at
      FROM items
      WHERE id = ?
      LIMIT 1
    `,
    [itemId]
  );

  if (!rows[0]) return null;

  const row = rows[0];
  return {
    ...row,
    item_status: normalizeItemStatus(row.item_status, Boolean(row.resolved)),
  };
};

const fetchClaimById = async (connection, claimId) => {
  const [rows] = await connection.execute('SELECT * FROM claims WHERE id = ? LIMIT 1', [claimId]);
  return rows[0] || null;
};

const getClaimSummaryForItem = async (itemId) => {
  try {
    const [itemRows] = await dbPool.execute(
      `
        SELECT item_status, resolved
        FROM items
        WHERE id = ?
        LIMIT 1
      `,
      [itemId]
    );

    const [rows] = await dbPool.execute(
      `
        SELECT
          COUNT(*) AS total_claims,
          COALESCE(SUM(status = 'Pending'), 0) AS pending_claims,
          COALESCE(SUM(status = 'Accepted'), 0) AS accepted_claims,
          COALESCE(SUM(status = 'On Hold'), 0) AS on_hold_claims,
          COALESCE(SUM(status = 'Rejected'), 0) AS rejected_claims,
          COALESCE(SUM(status = 'Expired'), 0) AS expired_claims,
          MAX(status = 'Accepted') AS has_accepted_claim,
          MAX(i.item_status = 'Under Claim Review') AS is_under_review,
          MAX(i.item_status = 'Resolved') AS is_resolved
        FROM claims c
        JOIN items i ON i.id = c.item_id
        WHERE c.item_id = ?
      `,
      [itemId]
    );

    const summary = rows[0] || {};
    const acceptedClaims = Number(summary.accepted_claims || 0);
    const onHoldClaims = Number(summary.on_hold_claims || 0);
    const itemRow = itemRows[0] || {};
    const itemStatus = normalizeItemStatus(itemRow.item_status, Boolean(itemRow.resolved));

    return {
      totalClaims: Number(summary.total_claims || 0),
      pendingClaims: Number(summary.pending_claims || 0),
      acceptedClaims,
      onHoldClaims,
      rejectedClaims: Number(summary.rejected_claims || 0),
      expiredClaims: Number(summary.expired_claims || 0),
      itemStatus,
      recoveryStatus: itemStatus,
    };
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return {
        totalClaims: 0,
        pendingClaims: 0,
        acceptedClaims: 0,
        onHoldClaims: 0,
        rejectedClaims: 0,
        expiredClaims: 0,
        itemStatus: ITEM_STATUSES.ACTIVE,
        recoveryStatus: ITEM_STATUSES.ACTIVE,
      };
    }

    throw error;
  }
};

const buildClaimResponse = async (connection, claimId) => {
  const [rows] = await connection.execute(
    `
      SELECT
        c.id,
        c.item_id,
        c.claimer_id,
        c.owner_id,
        c.proof_description,
        c.contact_note,
        c.status,
        c.status_note,
        c.created_at,
        c.accepted_at,
        c.on_hold_at,
        c.rejected_at,
        c.expired_at,
        i.title AS item_title,
        i.item_type,
        i.image AS item_image,
        i.resolved AS item_resolved,
        i.item_status,
        owner.full_name AS owner_name,
        claimer.full_name AS claimer_name
      FROM claims c
      JOIN items i ON i.id = c.item_id
      JOIN users owner ON owner.id = c.owner_id
      JOIN users claimer ON claimer.id = c.claimer_id
      WHERE c.id = ?
      LIMIT 1
    `,
    [claimId]
  );

  return rows[0] ? mapClaimRow(rows[0]) : null;
};

const getAuthorizedClaim = async (connection, claimId, userId) => {
  const claim = await fetchClaimById(connection, claimId);

  if (!claim) {
    return { error: { statusCode: 404, message: 'Claim not found.' } };
  }

  if (claim.owner_id !== userId && claim.claimer_id !== userId) {
    return { error: { statusCode: 403, message: 'You are not allowed to view this claim.' } };
  }

  return { claim };
};

const queryClaims = async (whereClause, params) => {
  const [rows] = await dbPool.execute(
    `
      SELECT
        c.id,
        c.item_id,
        c.claimer_id,
        c.owner_id,
        c.proof_description,
        c.contact_note,
        c.status,
        c.status_note,
        c.created_at,
        c.accepted_at,
        c.on_hold_at,
        c.rejected_at,
        c.expired_at,
        i.title AS item_title,
        i.item_type,
        i.image AS item_image,
        i.resolved AS item_resolved,
        i.item_status,
        owner.full_name AS owner_name,
        claimer.full_name AS claimer_name
      FROM claims c
      JOIN items i ON i.id = c.item_id
      JOIN users owner ON owner.id = c.owner_id
      JOIN users claimer ON claimer.id = c.claimer_id
      ${whereClause}
      ORDER BY CASE c.status WHEN 'Pending' THEN 0 WHEN 'Accepted' THEN 1 WHEN 'On Hold' THEN 2 WHEN 'Rejected' THEN 3 ELSE 4 END, c.created_at DESC
    `,
    params
  );

  return rows.map(mapClaimRow);
};

const submitClaim = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please fix the highlighted claim fields.',
      errors: errors.array(),
    });
  }

  const itemId = Number.parseInt(req.body.item_id, 10);
  const proofDescription = String(req.body.proof_description || '').trim();
  const contactNote = req.body.contact_note ? String(req.body.contact_note).trim() : null;

  const connection = await dbPool.getConnection();

  try {
    await ensureWorkflowSchema();
    await connection.beginTransaction();

    const item = await fetchItemById(connection, itemId);

    if (!item) {
      await connection.rollback();
      return res.status(404).json({ message: 'The selected item could not be found.' });
    }

    if (!VALID_ITEM_TYPES.has(item.item_type)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Only lost and found items can receive claims.' });
    }

    if (item.user_id === req.user.id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You cannot submit a claim on your own listing.' });
    }

    if (item.item_status === ITEM_STATUSES.RESOLVED || item.resolved) {
      await connection.rollback();
      return res.status(409).json({ message: 'This item has already been recovered.' });
    }

    const [duplicateRows] = await connection.execute(
      `
        SELECT id
        FROM claims
        WHERE item_id = ?
          AND claimer_id = ?
        LIMIT 1
      `,
      [item.id, req.user.id]
    );

    if (duplicateRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'You already submitted a claim for this item.' });
    }

    const initialStatus = item.item_status === ITEM_STATUSES.UNDER_REVIEW ? CLAIM_STATUSES.ON_HOLD : CLAIM_STATUSES.PENDING;

    const [result] = await connection.execute(
      `
        INSERT INTO claims (item_id, claimer_id, owner_id, proof_description, contact_note, status, status_note, on_hold_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        item.id,
        req.user.id,
        item.user_id,
        proofDescription,
        contactNote,
        initialStatus,
        initialStatus === CLAIM_STATUSES.ON_HOLD ? 'Owner is currently reviewing another claim.' : null,
        initialStatus === CLAIM_STATUSES.ON_HOLD ? new Date() : null,
      ]
    );

    await connection.commit();

    const claim = await buildClaimResponse(connection, result.insertId);

    queueNotification(
      item.user_id,
      'New claim received',
      'New claim received for your item.',
      'claim',
      item.id,
      claim.id
    );

    if (initialStatus === CLAIM_STATUSES.ON_HOLD) {
      queueNotification(
        req.user.id,
        'Claim on hold',
        'The owner is currently reviewing another claim.',
        'claim_status',
        item.id,
        claim.id
      );
    }

    return res.status(201).json({
      message: 'Your claim has been submitted successfully.',
      claim,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: 'Could not submit the claim right now.' });
  } finally {
    connection.release();
  }
};

const getIncomingClaims = async (req, res) => {
  try {
    await ensureWorkflowSchema();
    const claims = await queryClaims('WHERE c.owner_id = ?', [req.user.id]);
    const pendingCount = claims.filter((claim) => claim.status === CLAIM_STATUSES.PENDING).length;
    const underReviewCount = claims.filter((claim) => [CLAIM_STATUSES.ACCEPTED, CLAIM_STATUSES.ON_HOLD].includes(claim.status)).length;

    return res.status(200).json({
      message: 'Incoming claims fetched successfully.',
      claims,
      pendingCount,
      underReviewCount,
      totalClaims: claims.length,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load incoming claims right now.' });
  }
};

const getMyClaims = async (req, res) => {
  try {
    await ensureWorkflowSchema();
    const claims = await queryClaims('WHERE c.claimer_id = ?', [req.user.id]);

    return res.status(200).json({
      message: 'Your claims fetched successfully.',
      claims,
      totalClaims: claims.length,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load your claims right now.' });
  }
};

const getClaimDetail = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid claim id.',
      errors: errors.array(),
    });
  }

  try {
    await ensureWorkflowSchema();
    const connection = await dbPool.getConnection();

    try {
      const authorized = await getAuthorizedClaim(connection, Number.parseInt(req.params.id, 10), req.user.id);

      if (authorized.error) {
        return res.status(authorized.error.statusCode).json({ message: authorized.error.message });
      }

      const claim = await buildClaimResponse(connection, authorized.claim.id);

      return res.status(200).json({
        message: 'Claim fetched successfully.',
        claim,
        statusMessage: claimStatusMessage(claim.status),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    return res.status(500).json({ message: 'Could not load the claim right now.' });
  }
};

const acceptClaim = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid claim id.',
      errors: errors.array(),
    });
  }

  const claimId = Number.parseInt(req.params.id, 10);
  const connection = await dbPool.getConnection();

  try {
    await ensureWorkflowSchema();
    await connection.beginTransaction();

    const claim = await fetchClaimById(connection, claimId);

    if (!claim) {
      await connection.rollback();
      return res.status(404).json({ message: 'Claim not found.' });
    }

    if (claim.owner_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You can only review claims on your own listings.' });
    }

    if ([CLAIM_STATUSES.REJECTED, CLAIM_STATUSES.EXPIRED].includes(normalizeClaimStatus(claim.status))) {
      await connection.rollback();
      return res.status(409).json({ message: 'This claim can no longer be accepted.' });
    }

    const item = await fetchItemById(connection, claim.item_id);

    if (!item) {
      await connection.rollback();
      return res.status(404).json({ message: 'The related item could not be found.' });
    }

    if (item.user_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You can only manage your own listings.' });
    }

    const [otherClaimRows] = await connection.execute(
      `
        SELECT id, claimer_id
        FROM claims
        WHERE item_id = ?
          AND id <> ?
          AND status IN ('Pending', 'Accepted')
      `,
      [item.id, claim.id]
    );

    await connection.execute(
      `
        UPDATE claims
        SET status = 'On Hold',
            on_hold_at = COALESCE(on_hold_at, NOW()),
            status_note = 'Owner is currently reviewing another claim.'
        WHERE item_id = ?
          AND id <> ?
          AND status IN ('Pending', 'Accepted')
      `,
      [item.id, claim.id]
    );

    await connection.execute(
      `
        UPDATE claims
        SET status = 'Accepted',
            accepted_at = COALESCE(accepted_at, NOW()),
            on_hold_at = NULL,
            rejected_at = NULL,
            expired_at = NULL,
            status_note = NULL
        WHERE id = ?
      `,
      [claim.id]
    );

    await connection.execute(
      `
        UPDATE items
        SET item_status = 'Under Claim Review',
            resolved = FALSE
        WHERE id = ?
      `,
      [item.id]
    );

    await connection.commit();

    const updatedClaim = await buildClaimResponse(connection, claim.id);

    queueNotification(
      updatedClaim.claimer_id,
      'Claim accepted',
      'Your claim has been accepted.',
      'claim_status',
      item.id,
      updatedClaim.id
    );

    otherClaimRows.forEach((claimRow) => {
      queueNotification(
        claimRow.claimer_id,
        'Claim on hold',
        'The owner is currently reviewing another claim.',
        'claim_status',
        item.id,
        claimRow.id
      );
    });

    return res.status(200).json({
      message: 'Claim accepted. The item is now under claim review.',
      claim: updatedClaim,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: 'Could not accept the claim right now.' });
  } finally {
    connection.release();
  }
};

const rejectClaim = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid claim id.',
      errors: errors.array(),
    });
  }

  const claimId = Number.parseInt(req.params.id, 10);
  const connection = await dbPool.getConnection();

  try {
    await ensureWorkflowSchema();
    const claim = await fetchClaimById(connection, claimId);

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    if (claim.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only review claims on your own listings.' });
    }

    if ([CLAIM_STATUSES.REJECTED, CLAIM_STATUSES.EXPIRED, CLAIM_STATUSES.ACCEPTED].includes(normalizeClaimStatus(claim.status))) {
      return res.status(409).json({ message: 'This claim cannot be rejected right now.' });
    }

    await connection.execute(
      `
        UPDATE claims
        SET status = 'Rejected',
            rejected_at = NOW(),
            status_note = 'Claim was rejected by the owner.'
        WHERE id = ?
      `,
      [claim.id]
    );

    const updatedClaim = await buildClaimResponse(connection, claim.id);

    queueNotification(
      updatedClaim.claimer_id,
      'Claim rejected',
      'Your claim was rejected.',
      'claim_status',
      claim.item_id,
      updatedClaim.id
    );

    return res.status(200).json({
      message: 'Your claim was not approved.',
      claim: updatedClaim,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not reject the claim right now.' });
  } finally {
    connection.release();
  }
};

const resolveItemForOwner = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please provide a valid item id.',
      errors: errors.array(),
    });
  }

  const itemId = Number.parseInt(req.params.id, 10);
  const connection = await dbPool.getConnection();

  try {
    await ensureWorkflowSchema();
    await connection.beginTransaction();

    const item = await fetchItemById(connection, itemId);

    if (!item) {
      await connection.rollback();
      return res.status(404).json({ message: 'Item not found.' });
    }

    if (item.user_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ message: 'You can only manage your own listings.' });
    }

    const [claimRows] = await connection.execute(
      `
        SELECT id, claimer_id, status
        FROM claims
        WHERE item_id = ?
      `,
      [item.id]
    );

    await connection.execute(
      `
        UPDATE items
        SET item_status = 'Resolved',
            resolved = TRUE
        WHERE id = ?
      `,
      [item.id]
    );

    await connection.execute(
      `
        UPDATE claims
        SET status = 'Rejected',
            rejected_at = NOW(),
            status_note = 'Item already recovered.'
        WHERE item_id = ?
          AND status IN ('Pending', 'On Hold')
      `,
      [item.id]
    );

    await connection.commit();

    if (item.item_type === 'sell') {
      queueNotification(
        req.user.id,
        'Listing sold',
        'Your listing has been marked as sold.',
        'marketplace',
        item.id,
        null
      );
    } else {
      claimRows.forEach((claimRow) => {
        if (claimRow.status === CLAIM_STATUSES.ACCEPTED) {
          queueNotification(
            claimRow.claimer_id,
            'Item resolved',
            'Item successfully marked as resolved.',
            'item_status',
            item.id,
            claimRow.id
          );
          return;
        }

        queueNotification(
          claimRow.claimer_id,
          'Item resolved',
          'This item has been resolved. Your claim has been closed.',
          'item_status',
          item.id,
          claimRow.id
        );
      });
    }

    return res.status(200).json({
      message: 'Item marked as resolved.',
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: 'Could not mark the item as resolved right now.' });
  } finally {
    connection.release();
  }
};

const getClaimSummary = async (req, res) => {
  try {
    await ensureWorkflowSchema();

    const [ownerRows] = await dbPool.execute(
      `
        SELECT
          COALESCE(SUM(status = 'Pending'), 0) AS pending_claims,
          COALESCE(SUM(status IN ('Accepted', 'On Hold')), 0) AS claims_under_review,
          COALESCE(SUM(i.item_status = 'Resolved'), 0) AS resolved_recoveries
        FROM claims c
        JOIN items i ON i.id = c.item_id
        WHERE c.owner_id = ?
      `,
      [req.user.id]
    );

    const [studentRows] = await dbPool.execute(
      `
        SELECT
          COALESCE(COUNT(*), 0) AS my_claims,
          COALESCE(SUM(status = 'Pending'), 0) AS pending_claims,
          COALESCE(SUM(status = 'Accepted'), 0) AS accepted_claims,
          COALESCE(SUM(status = 'On Hold'), 0) AS on_hold_claims,
          COALESCE(SUM(status = 'Rejected'), 0) AS rejected_claims,
          COALESCE(SUM(status = 'Expired'), 0) AS expired_claims
        FROM claims
        WHERE claimer_id = ?
      `,
      [req.user.id]
    );

    const owner = ownerRows[0] || {};
    const student = studentRows[0] || {};

    return res.status(200).json({
      message: 'Claim summary fetched successfully.',
      summary: {
        owner: {
          pendingClaims: Number(owner.pending_claims || 0),
          claimsUnderReview: Number(owner.claims_under_review || 0),
          resolvedRecoveries: Number(owner.resolved_recoveries || 0),
        },
        student: {
          myClaims: Number(student.my_claims || 0),
          pendingClaims: Number(student.pending_claims || 0),
          acceptedClaims: Number(student.accepted_claims || 0),
          onHoldClaims: Number(student.on_hold_claims || 0),
          rejectedClaims: Number(student.rejected_claims || 0),
          expiredClaims: Number(student.expired_claims || 0),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load claim summary right now.' });
  }
};

const runClaimExpirySweep = async () => {
  try {
    await ensureWorkflowSchema();
    const connection = await dbPool.getConnection();

    try {
      const [rows] = await connection.execute(
        `
          SELECT DISTINCT i.id AS item_id, c.id AS accepted_claim_id
          FROM items i
          JOIN claims c ON c.item_id = i.id
          WHERE i.item_status = 'Under Claim Review'
            AND c.status = 'Accepted'
            AND COALESCE(c.accepted_at, c.created_at) <= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `
      );

      for (const row of rows) {
        await connection.beginTransaction();

        try {
          await connection.execute(
            `
              UPDATE claims
              SET status = 'Expired',
                  expired_at = NOW(),
                  status_note = 'Accepted claim expired after seven days.'
              WHERE id = ?
                AND status = 'Accepted'
            `,
            [row.accepted_claim_id]
          );

          await connection.execute(
            `
              UPDATE claims
              SET status = 'Rejected',
                  rejected_at = NOW(),
                  status_note = 'Accepted claim expired after seven days.'
              WHERE item_id = ?
                AND status IN ('Pending', 'On Hold')
            `,
            [row.item_id]
          );

          await connection.execute(
            `
              UPDATE items
              SET item_status = 'Active',
                  resolved = FALSE
              WHERE id = ?
            `,
            [row.item_id]
          );

          await connection.commit();

          const [acceptedRows] = await connection.execute(
            `
              SELECT claimer_id
              FROM claims
              WHERE id = ?
              LIMIT 1
            `,
            [row.accepted_claim_id]
          );

          const acceptedClaim = acceptedRows[0];

          if (acceptedClaim) {
            queueNotification(
              acceptedClaim.claimer_id,
              'Claim expired',
              'Your accepted claim has expired.',
              'claim_status',
              row.item_id,
              row.accepted_claim_id
            );
          }
        } catch (error) {
          await connection.rollback();
        }
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Claim expiry sweep failed:', error.message);
  }
};

module.exports = {
  ITEM_STATUSES,
  CLAIM_STATUSES,
  normalizeClaimStatus,
  normalizeItemStatus,
  getItemStatusRank,
  claimStatusMessage,
  getClaimSummaryForItem,
  ensureWorkflowSchema,
  runClaimExpirySweep,
  submitClaim,
  getIncomingClaims,
  getMyClaims,
  getClaimDetail,
  acceptClaim,
  rejectClaim,
  resolveItemForOwner,
  getClaimSummary,
};