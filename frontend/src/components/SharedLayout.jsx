import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const SharedLayout = () => {
  return (
    <div className="app-shell">
      <Navbar />

      <div className="layout-inner">
        <Sidebar />

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SharedLayout;
