import { Atomico, DOMProps } from "./dom";
import {
    FillObject,
    SchemaInfer,
    SchemaProps,
    ConstructorType,
} from "./schema";
import { Sheets } from "./css";

/**
 * Infer the types from `component.props`.
 
 * ```tsx
 * function component({value}: Props<typeof component.props >){
 *      return <host/>
 * }
 *
 * component.props = {value:Number}
 * ```
 */
type GetProps<P> = P extends {
    readonly "##props"?: infer P;
}
    ? P
    : P extends { props: SchemaProps }
    ? GetProps<P["props"]>
    : {
          [K in keyof P]?: P[K] extends {
              type: infer T;
              value: infer V;
          }
              ? FunctionConstructor extends T
                  ? V
                  : V extends () => infer T
                  ? T
                  : V
              : P[K] extends { type: infer T }
              ? ConstructorType<T>
              : ConstructorType<P[K]>;
      };

type ReplaceProps<P, Types> = {
    [I in keyof P]?: I extends keyof Types ? Types[I] : P;
};
/**
 * Infers the props from the component's props object, example:
 * ### Syntax
 * ```tsx
 * const myProps = { message: String }
 * Props<typeof MyProps>;
 * // {message: string}
 * ```
 * ### Usage
 * You can use the `Prop` type on components, objects or constructors, example:
 * ```tsx
 * function component({message}: Props<typeof component>){
 *  return <host></host>
 * }
 *
 * component.props = {message: String}
 * ```
 *
 * ### Advanced use
 *
 * It also allows to replace types of those already inferred, example:
 * ```tsx
 * Props<typeof MyProps, {message: "hello"|"bye bye"}>;
 * // {message?: "hello"|"bye bye"}
 *
 * ```
 */
export type Props<P, Types = null> = Types extends null
    ? GetProps<P>
    : ReplaceProps<GetProps<P>, Types>;

export type Component<Props = null, Meta = any> = Props extends null
    ? {
          (props: FillObject): Host<Meta>;
          props?: SchemaProps;
          styles?: Sheets;
      }
    : {
          (props: DOMProps<Props>): Host<Meta>;
          props: SchemaInfer<Props> &
              MetaProps<
                  Meta extends null ? Props : Props & SyntheticMetaProps<Meta>
              >;
          styles?: Sheets;
      };

export type CreateElement<C, Base, CheckMeta = true> = CheckMeta extends true
    ? C extends (props: any) => Host<infer Meta>
        ? CreateElement<C & { props: SyntheticProps<Meta> }, Base, false>
        : CreateElement<C, Base, false>
    : C extends { props: infer P }
    ? Atomico<Props<P>, Base>
    : Atomico<{}, Base>;

export type SyntheticProps<Props> = {
    [Prop in keyof Props]: Prop extends `on${string}`
        ? {
              type: Function;
              value: (event: Props[Prop]) => any;
          }
        : {
              type: Function;
              value: Props[Prop];
          };
};

export type SyntheticMetaProps<Meta> = {
    [Prop in keyof Meta]?: Prop extends `on${string}`
        ? (event: Meta[Prop]) => any
        : Meta[Prop];
};

export type Host<Meta> = {};

export type C = <
    FnComponent extends Component | MetaComponent,
    BaseElement extends typeof HTMLElement
>(
    component: FnComponent,
    baseElement?: BaseElement
) => CreateElement<FnComponent, BaseElement>;

export const c: C;

export type FunctionalComponent<Props> = (props: Props) => any;

/**
 * metaProps allow to hide the props assigned by Component<props>
 */
interface MetaProps<Props> {
    readonly "##props"?: Props;
}

/**
 * The MetaComponent type allows to identify as
 * validate types generated by Component<props>
 */
interface MetaComponent {
    (props: any): any;
    props: MetaProps<any>;
    styles?: Sheets;
}
