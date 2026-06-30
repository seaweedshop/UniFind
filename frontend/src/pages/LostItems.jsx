import ItemBrowsePage from '../components/ItemBrowsePage';

const LostItems = () => (
  <ItemBrowsePage
    title="Lost Items"
    description="Search and filter lost-item reports across the campus feed."
    defaultItemType="lost"
    emptyTitle="No lost items found."
    emptyDescription="Try a different keyword, category, or sorting option."
  />
);

export default LostItems;
