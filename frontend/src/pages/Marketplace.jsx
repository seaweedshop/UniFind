import ItemBrowsePage from '../components/ItemBrowsePage';

const Marketplace = () => (
  <ItemBrowsePage
    title="Marketplace"
    description="Browse sell listings with keyword, category, and price sorting."
    defaultItemType="sell"
    emptyTitle="No marketplace items available."
    emptyDescription="Try a different keyword, category, or sort option."
  />
);

export default Marketplace;
