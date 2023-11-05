import { VueyeTableProps, VueyeTableEmits } from '../api'
import { nestedObjectTransformer } from '../utils'

export function useSelection<TData extends Record<string, any>>(
    props: Pick<VueyeTableProps<TData>, 'selectMode' | 'selected' | 'data'>,
    bodyRows: Ref<Record<string, any>[]>,
    emit: VueyeTableEmits<TData>
) {
    const selectAll = computed({
        get() {
            return props.selected === null || props.selected?.length === 0
                ? 'none'
                : props.selected?.length === props.data.length ||
                  (props.selectMode === 'page' && props.selected?.length === bodyRows.value.length)
                ? 'all'
                : 'indeterminate'
        },
        set(value) {
            if (value === 'all') {
                if (props.selectMode === 'page') {
                    selected.value = bodyRows.value.map((row) => nestedObjectTransformer(row)) as TData[]
                } else {
                    selected.value = props.data
                }
            } else if (value === 'none') selected.value = []
        },
    })

    const selected = computed({
        get() {
            return props.selected as TData[]
        },
        set(value: TData[]) {
            emit('update:selected', value)
        },
    })

    return {
        selectAll,
        selected,
    }
}
