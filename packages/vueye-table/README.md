# VueyeTableProps TypeScript Definition

This Markdown file provides documentation for the TypeScript `VueyeTableProps` type and its associated default values.

## VueyeTableProps Type

`VueyeTableProps` is a TypeScript type that represents the properties for a Vueye table component.

### Properties

-   `itemValue?: string` (Optional)

    -   The key used to identify items in the data array.
    -   Default: `'id'`

-   `columnHeaders: TColumn[]`

    -   An array of column headers.

-   `data: TData[]`

    -   An array of data.

-   `perPage?: number` (Optional)

    -   The number of items to display per page.
    -   Default: `10`

-   `currentPage?: number` (Optional)

    -   The current page number.
    -   Default: `1`

-   `perPageOptions?: number[]` (Optional)

    -   An array of options for the number of items to display per page.
    -   Default: `[5, 10, 20, 30]`

-   `loading?: boolean` (Optional)

    -   Indicates whether the table is in a loading state.
    -   Default: `false`

-   `selectable?: boolean` (Optional)

    -   Indicates whether items in the table are selectable.
    -   Default: `false`

-   `caption?: string` (Optional)

    -   A caption for the table.
    -   Default: `''`

-   `summary?: string` (Optional)
    -   A summary for the table.
    -   Default: `''`
