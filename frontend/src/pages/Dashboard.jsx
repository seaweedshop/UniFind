import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSection from '../components/DashboardSection';
import ConversationList from '../components/ConversationList/ConversationList';
import ItemCard from '../components/ItemCard';
import Loader from '../components/Loader';
import NotificationList from '../components/NotificationList/NotificationList';
import { fetchItems } from '../services/itemService';
import { fetchClaimSummary } from '../services/claimService';
import { fetchNotifications } from '../services/notificationService';
import { fetchConversations } from '../services/conversationService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState({ lost: [], found: [], sell: [] });
  const [claimSummary, setClaimSummary] = useState({ owner: {}, student: {} });
  const [notifications, setNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const loadDashboardItems = async () => {
      try {
        const [lostResponse, foundResponse, sellResponse, claimSummaryResponse, notificationResponse, conversationResponse] = await Promise.all([
          fetchItems({ item_type: 'lost', sort: 'newest', limit: 3 }),
          fetchItems({ item_type: 'found', sort: 'newest', limit: 3 }),
          fetchItems({ item_type: 'sell', sort: 'newest', limit: 3 }),
          fetchClaimSummary(),
          fetchNotifications({ limit: 5 }),
          fetchConversations({ limit: 3 }),
        ]);

        setItems({
          lost: lostResponse.items || [],
          found: foundResponse.items || [],
          sell: sellResponse.items || [],
        });
        setClaimSummary(claimSummaryResponse?.summary || { owner: {}, student: {} });
        setNotifications(notificationResponse?.notifications || []);
        setConversations((conversationResponse?.conversations || []).slice(0, 3));
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load dashboard items.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardItems();
  }, [retryKey]);

  const recentLost = items.lost || [];
  const recentFound = items.found || [];
  const recentSell = items.sell || [];

  return (
    <section className="dashboard-shell">
      <header className="dashboard-hero page-card">
        <div>
          <span className="eyebrow">Campus activity</span>
          <h1>Welcome back</h1>
          <p className="muted">Overview and quick access to the latest campus listings.</p>
        </div>
        <div className="quick-actions">
          <span className="quick-actions-label">Quick actions</span>
          <div className="actions">
            <button type="button" className="btn" onClick={() => navigate('/post-item?type=lost')}>Report Lost</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/post-item?type=found')}>Report Found</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/post-item?type=sell')}>Sell an Item</button>
          </div>
        </div>
      </header>

      {loading ? <Loader label="Loading dashboard items..." /> : null}
      {error ? (
        <div className="form-alert form-alert-with-action">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setRetryKey((value) => value + 1)}>
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="dashboard-grid">
          <div className="dashboard-stat-grid">
          <button type="button" className="card dashboard-claim-card" onClick={() => navigate('/claims/incoming')}>
            <span className="metric-icon" aria-hidden="true">◇</span>
            <h3>Incoming Claims</h3>
            <strong>{claimSummary.owner?.pendingClaims || 0}</strong>
            <p className="muted">Pending claims on your listings.</p>
          </button>

          <button type="button" className="card dashboard-claim-card" onClick={() => navigate('/claims/incoming')}>
            <h3>Claims Under Review</h3>
            <strong>{claimSummary.owner?.claimsUnderReview || 0}</strong>
            <p className="muted">Claims you are currently reviewing.</p>
          </button>

          <button type="button" className="card dashboard-claim-card" onClick={() => navigate('/claims/incoming')}>
            <h3>Resolved Recoveries</h3>
            <strong>{claimSummary.owner?.resolvedRecoveries || 0}</strong>
            <p className="muted">Items you have explicitly marked as resolved.</p>
          </button>

          <button type="button" className="card dashboard-claim-card" onClick={() => navigate('/claims/me')}>
            <span className="metric-icon" aria-hidden="true">↗</span>
            <h3>My Claim Requests</h3>
            <strong>{claimSummary.student?.myClaims || 0}</strong>
            <p className="muted">Claims you have submitted.</p>
          </button>
          </div>

          <div className="dashboard-activity-grid">
            <DashboardSection
            title="Recent Notifications"
            actions={[
              <button key="notifications-view-all" className="btn btn-secondary" onClick={() => navigate('/notifications')}>
                View All
              </button>,
            ]}
          >
            <NotificationList
              notifications={notifications}
              compact
              emptyDescription="No notifications yet."
            />
            </DashboardSection>

            <DashboardSection
            title="Recent Conversations"
            actions={[
              <button key="messages-view-all" className="btn btn-secondary" onClick={() => navigate('/messages')}>
                View All Messages
              </button>,
            ]}
          >
            <ConversationList
              conversations={conversations}
              compact
              onSelectConversation={(conversation) => navigate(`/messages?conversation=${conversation.id}`)}
              emptyDescription="No conversations yet."
            />
            </DashboardSection>
          </div>

          <div className="dashboard-listings-grid">
            <DashboardSection
            title="Recent Lost Items"
            actions={[
              <button key="lost-view-all" className="btn btn-secondary" onClick={() => navigate('/lost-items')}>
                View All
              </button>,
            ]}
          >
            <div className="items-grid">
              {recentLost.length > 0 ? recentLost.map((item) => <ItemCard key={item.id} item={item} />) : <p className="muted">No lost items yet.</p>}
            </div>
            </DashboardSection>

            <DashboardSection
            title="Recent Found Items"
            actions={[
              <button key="found-view-all" className="btn btn-secondary" onClick={() => navigate('/found-items')}>
                View All
              </button>,
            ]}
          >
            <div className="items-grid">
              {recentFound.length > 0 ? recentFound.map((item) => <ItemCard key={item.id} item={item} />) : <p className="muted">No found items yet.</p>}
            </div>
            </DashboardSection>

            <DashboardSection
            title="Recent Marketplace Items"
            actions={[
              <button key="sell-view-all" className="btn btn-secondary" onClick={() => navigate('/marketplace')}>
                View All
              </button>,
            ]}
          >
            <div className="items-grid">
              {recentSell.length > 0 ? recentSell.map((item) => <ItemCard key={item.id} item={item} />) : <p className="muted">No marketplace items yet.</p>}
            </div>
            </DashboardSection>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default Dashboard;
