import { ref, reactive, watch } from '@vue/composition-api';
import { getDeepNestedFieldValue as nestedVal } from '../helpers';

const useSorter = (data, sortBy) => {
	const sortedBy = reactive({
		label: null,
		key: sortBy,
		direction: 'none',
		sortClass: 've-table-sort-none',
	});

	let sortedData = ref([...data]);
	watch(sortBy, () => {
	
		sort({ label: null, key: sortBy });
	});
	function sort(column) {
		if (column.key !== sortedBy.key) {
			sortedBy.direction = 'none';
		}
		sortedBy.key = column.key;
		sortedBy.label = column.label;

		if (sortedBy.direction === 'none') {
			sortedBy.direction = 'asc';
		} else if (sortedBy.direction === 'asc') {
			sortedBy.direction = 'desc';
		} else {
			sortedBy.direction = 'none';
			sortedBy.key = null;
			sortedBy.label = null;
		}

		sortedBy.sortClass = 've-table-sort-' + sortedBy.direction;
		if (sortedBy.direction !== 'none') {
			sortedData.value.sort(compareValues(column.key, sortedBy.direction));
		}
	}

	function arrowSortShown(column) {
		return column.sortable && (sortedBy.direction === 'none' || column.key === sortedBy.key);
	}
	function labelClass(column) {
		return [
			{
				've-table-head-cell-sorted': column.key === sortedBy.key && column.sortable,
				've-table-head-cell-sortable': column.sortable,
			},
			sortedBy.sortClass,
		];
	}
	function compareValues(key, order) {
		return function(a, b) {
			/*	if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
				// property doesn't exist on either object
				return 0;
			}*/

			let varA = typeof nestedVal(key, a) === 'string' ? nestedVal(key, a).toUpperCase() : nestedVal(key, a);
			let varB = typeof nestedVal(key, b) === 'string' ? nestedVal(key, b).toUpperCase() : nestedVal(key, b);

			let comparison = 0;
			if (varA > varB) {
				comparison = 1;
			} else if (varA < varB) {
				comparison = -1;
			}
			return order === 'desc' ? comparison * -1 : comparison;
		};
	}

	return { handler: sort, data: sortedData, labelClass, column: sortedBy, arrowSortShown };
};

export default useSorter;
