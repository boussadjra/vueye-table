import { h, mergeProps, type Component, type FunctionalComponent } from "vue";

/**
 * Wrap a component so it always carries a class. Props, attributes, and slots pass through
 * untouched, so the wrapper keeps the wrapped component's full API.
 */
export function withClass<TComponent extends Component>(
  component: TComponent,
  className: string,
  name: string,
): TComponent {
  const wrapper: FunctionalComponent = (_props, { attrs, slots }) =>
    h(component, mergeProps(attrs, { class: className }), slots);
  wrapper.displayName = name;
  wrapper.inheritAttrs = false;
  return wrapper as unknown as TComponent;
}
