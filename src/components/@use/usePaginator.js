import { ref, computed, watch } from '@vue/composition-api';

const usePaginator = (data, pPage) => {
	const pages = ref([]);
	const perPage = ref(pPage);

	const currentPage = ref(1);
	watch(
		() => [data, perPage],
		() => {
			paginate();
		}
	);

	function paginate() {
		pages.value = [];
		let start = 0;
		let end = perPage.value;
		while (start <= data.length) {
			pages.value.push(data.slice(start, end));

			start = start + perPage.value;
			end = end + perPage.value;
		}
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

	return { pages, pagesCount, currentPage, next, prev, last, first, setPerPage, currentPageItems };
};

export default usePaginator;
