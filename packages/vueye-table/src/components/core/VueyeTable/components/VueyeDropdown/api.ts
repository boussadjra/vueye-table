export type OptionValue = string | number | boolean | object | symbol

interface Option {
    content: OptionValue
    label: string
}

export type dropdownProps = {
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
