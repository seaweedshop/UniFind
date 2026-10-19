import Navbar from './Navbar';
import Sidebar from './Sidebar';
import NotificationToastContainer from './NotificationToast/NotificationToastContainer';
import { NotificationProvider } from '../context/NotificationContext';
import { Outlet } from 'react-router-dom';

const SharedLayout = () => {
  return (
    <NotificationProvider>
      <div className="app-shell">
        <Navbar />

        <div className="layout-inner">
          <Sidebar />

          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>
      <NotificationToastContainer />
    </NotificationProvider>
  );
};

export default SharedLayout;
