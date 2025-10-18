const SearchForm = ({ inputTo }: { inputTo: string }) => {
  return (
    <div className="mt-2 relative">
      <input
        className="searchForm"
        type="text"
        placeholder="To:"
        value={inputTo}
      />
    </div>
  );
};

export default SearchForm;
