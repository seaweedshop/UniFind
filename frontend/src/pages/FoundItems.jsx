import ItemBrowsePage from '../components/ItemBrowsePage';

const FoundItems = () => (
  <ItemBrowsePage
    title="Found Items"
    description="Review found-item reports and narrow results with search and filters."
    defaultItemType="found"
    emptyTitle="No found items found."
    emptyDescription="Try a different keyword, category, or sorting option."
  />
);

export default FoundItems;
