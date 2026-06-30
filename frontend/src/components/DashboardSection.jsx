const DashboardSection = ({ title, actions = [], children }) => {
  return (
    <section className="dashboard-section page-card">
      <div className="section-header">
        <div className="section-header-row">
          <h2>{title}</h2>
          {actions.length > 0 ? <div className="section-actions">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
};

export default DashboardSection;
