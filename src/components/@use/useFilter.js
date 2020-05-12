import { ref, reactive, toRefs } from '@vue/composition-api';

const useFilter = (_items, _value, _key = null) => {
	const filter = reactive({
		items: _items,
		filteredItems: _items,
		searchValue: _value,
		key: _key,
	});

	function setItems(items) {
		filter.items = items;
	}

	function setSearchValue(searchValue) {
		filter.searchValue = searchValue;
	}

	function setKey(key) {
		filter.key = key;
	}

	function handler() {
	
		if (filter.key === null || filter.key === 'all') {
			filter.searchValue = '';
		
			filter.filteredItems = filter.items;
		} else {
			filter.filteredItems = filter.items.filter(item => {
				if (filter.key) {
					return item[filter.key]
						.toString()
						.toLowerCase()
						.includes(filter.searchValue.trim().toLowerCase());
				} else {
					let includes = false;
					for (const key in item) {
						includes = item[key]
							.toString()
							.toLowerCase()
							.includes(filter.searchValue.trim().toLowerCase());
					}
					return includes;
				}
			});
		}
	}

	return { ...toRefs(filter), setItems, setSearchValue, setKey, handler };
};

export default useFilter;
