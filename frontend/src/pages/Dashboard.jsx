import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSection from '../components/DashboardSection';
import ItemCard from '../components/ItemCard';
import Loader from '../components/Loader';
import { fetchItems } from '../services/itemService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState({ lost: [], found: [], sell: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardItems = async () => {
      try {
        const [lostResponse, foundResponse, sellResponse] = await Promise.all([
          fetchItems({ item_type: 'lost', sort: 'newest', limit: 3 }),
          fetchItems({ item_type: 'found', sort: 'newest', limit: 3 }),
          fetchItems({ item_type: 'sell', sort: 'newest', limit: 3 }),
        ]);

        setItems({
          lost: lostResponse.items || [],
          found: foundResponse.items || [],
          sell: sellResponse.items || [],
        });
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load dashboard items.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardItems();
  }, []);

  const recentLost = items.lost || [];
  const recentFound = items.found || [];
  const recentSell = items.sell || [];

  return (
    <section className="dashboard-shell">
      <header className="page-card">
        <h1>Dashboard</h1>
        <p className="muted">Overview and quick access to the latest campus listings.</p>
      </header>

      {loading ? <Loader label="Loading dashboard items..." /> : null}
      {error ? <div className="form-alert">{error}</div> : null}

      {!loading && !error ? (
        <div className="dashboard-grid">
          <div className="card quick-actions">
            <h3>Quick Actions</h3>
            <div className="actions">
              <button className="btn" onClick={() => navigate('/post-item')}>
                Report Lost Item
              </button>
              <button className="btn" onClick={() => navigate('/post-item')}>
                Report Found Item
              </button>
              <button className="btn" onClick={() => navigate('/post-item')}>
                Post to Marketplace
              </button>
            </div>
          </div>

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
      ) : null}
    </section>
  );
};

export default Dashboard;
