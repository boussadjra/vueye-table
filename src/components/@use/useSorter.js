import { ref, reactive, watch } from '@vue/composition-api';
import { getDeepNestedFieldValue as nestedVal } from '../helpers';

const useSorter = (data, sortBy) => {
	const sortedBy = reactive({
		label: null,
		key: null,
		direction: 'none',
		sortClass: 've-table-sort-none',
	});

	let sortedData = ref([...data]);

	watch('sortBy', (newVal, oldVal) => {
		sortedBy.key = newVal;

		newVal ? sort({ label: null, key: newVal }) : {};
	});

	/*watch('data', (newVal, oldVal) => {
		sortedData.value = newVal;
		//	sort({ label: null, key: sortBy });
	});*/

	function setSortedData(newData) {
		sortedData.value = newData;
	}
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
			resetSortedBy();
		}

		sortedBy.sortClass = 've-table-sort-' + sortedBy.direction;
		if (sortedBy.direction !== 'none') {
			sortedData.value.sort(compareValues(column.key, sortedBy.direction));
		}
	}
	function resetSortedBy() {
		sortedBy.direction = 'none';
		sortedBy.key = null;
		sortedBy.label = null;
		sortedBy.sortClass = 've-table-sort-' + sortedBy.direction;
	}
	function arrowSortShown(column) {
		return column.sortable && (sortedBy.direction === 'none' || column.key === sortedBy.key);
	}
	function labelClass(column) {

		let classes= [
			{
				've-table-head-cell-sorted': column.key === sortedBy.key && column.sortable,
				've-table-head-cell-sortable': column.sortable,
			},
			sortedBy.sortClass,
		];

		return classes;
	}
	function compareValues(key, order) {
		return function(a, b) {
			let valA = nestedVal(key, a);
			let valB = nestedVal(key, b);
			let varA = null;
			let varB = null;
			if (isNaN(Number(valA))) {
				varA = typeof valA === 'string' ? valA.toUpperCase() : valA;
				varB = typeof valB === 'string' ? valB.toUpperCase() : valB;
			} else {
				varA = Number(valA);
				varB = Number(valB);
			}
			let comparison = 0;
			if (varA > varB) {
				comparison = 1;
			} else if (varA < varB) {
				comparison = -1;
			}
			return order === 'desc' ? comparison * -1 : comparison;
		};
	}

	return {
		handler: sort,
		data: sortedData,
		labelClass,
		column: sortedBy,
		arrowSortShown,
		setSortedData,
		resetSortedBy,
	};
};

export default useSorter;
