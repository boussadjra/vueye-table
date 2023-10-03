export type OptionValue = string | number | boolean | object | symbol

interface Option {
    content: OptionValue
    label: string
}

export type DropdownProps = {
    options: Option[]
    modelValue: string | number
    label: string
    defaultValue?: Option
}

export const dropdownPropsDefaults = {
    options: () => [],
    modelValue: '',
    label: '',
}

export type DropdownEmits = {
    (event: 'update:modelValue', value: OptionValue): void
}
