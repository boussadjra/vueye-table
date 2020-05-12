import { ref, computed, watch } from '@vue/composition-api';

const usePaginator = (data, pPage = 10) => {
	const notPagedData = ref([...data]);
	const pages = ref([]);
	const perPage = ref(pPage);

	const currentPage = ref(1);

	function setNotPagedData(_data, test) {
		notPagedData.value = _data;
	}
	watch(notPagedData, () => {
		paginate();
	});
	watch(perPage, () => {
		paginate();
	});
	function paginate() {
		pages.value = [];
		let start = 0;
		let end = perPage.value;
		while (start <= notPagedData.value.length) {
			pages.value.push(notPagedData.value.slice(start, end));

			start = start + perPage.value;
			end = end + perPage.value;
		}
		currentPage.value=1

	}
	const pagesCount = computed(() => pages.value.length);

	const currentPageItems = computed(() => {
		return pages.value[currentPage.value - 1];
	});
	function setPerPage(_perPage) {
		perPage.value = _perPage;
		paginate();
	}
	function next() {
		currentPage.value < pagesCount.value ? currentPage.value++ : {};
	}
	function prev() {
		currentPage.value > 0 ? currentPage.value-- : {};
	}
	function first() {
		currentPage.value = 1;
	}
	function last() {
		currentPage.value = pagesCount.value;
	}

	return {
		pages,
		pagesCount,
		currentPage,
		next,
		prev,
		last,
		first,
		setPerPage,
		currentPageItems,
		notPagedData,
		setNotPagedData,
	};
};

export default usePaginator;
