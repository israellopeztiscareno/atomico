import { setPrototype, transformValue } from "./set-prototype.js";
import { createHooks } from "../hooks/create-hooks.js";
import { render } from "../render.js";
export { Any } from "./set-prototype.js";
import { RenderError } from "./errors.js";
import options from "../options.js";
/**
 * Class to extend for lifecycle assignment
 * @param {any} component - Function to transform into customElement
 * @param {Base} [Base] - Class to extend for lifecycle assignment
 */
export function c(component, Base = HTMLElement) {
    /**
     * @type {import("./set-prototype").Attrs}
     */
    let attrs = {};
    /**
     * @type {import("./set-prototype").Values}
     */
    let values = {};

    let { props, styles } = component;

    let Atom = class extends Base {
        constructor() {
            super();
            this._setup();
            this._render = () => component({ ...this._props });
            for (let prop in values) this[prop] = values[prop];
        }
        /**
         * @returns {Style[]|Style}
         */
        static get styles() {
            return styles;
        }
        /**
         * @returns {Style[]|Style}
         */
        static get _styles() {
            let { styles } = this;
            //@ts-ignore
            return [].concat(super.styles || [], styles || []);
        }

        async _setup() {
            // _setup only continues if _props has not been defined
            if (this._props) return;

            this._props = {};

            this.mounted = new Promise((resolve) => (this.mount = resolve));

            this.unmounted = new Promise((resolve) => (this.unmount = resolve));

            this.symbolId = Symbol();

            let hooks = createHooks(() => this.update(), this);

            let prevent;

            let firstRender = true;

            this.update = () => {
                if (!prevent) {
                    prevent = true;

                    /**
                     * this.updated is defined at the runtime of the render,
                     * if it fails it is caught by mistake to unlock prevent
                     */
                    this.updated = this.mounted
                        .then(
                            () => {
                                render(
                                    hooks.load(this._render),
                                    this,
                                    this.symbolId
                                );
                                prevent = false;
                                if (firstRender) {
                                    firstRender = false;
                                    // @ts-ignore
                                    applyStyles(this);
                                }
                                return hooks.cleanEffects();
                            },
                            (message) => {
                                prevent = false;
                                throw new RenderError(this, message);
                            }
                        )
                        // next tick
                        .then((cleanEffect) => {
                            cleanEffect && cleanEffect();
                        });
                }
                return this.updated;
            };

            this.update();

            await this.unmounted;

            hooks.cleanEffects(true)();
        }
        connectedCallback() {
            this.mount();
        }
        async disconnectedCallback() {
            // The webcomponent will only resolve disconnected if it is
            // actually disconnected of the document, otherwise it will keep the record.
            await this.mounted;
            !this.isConnected && this.unmount();
        }
        /**
         * @param {string} attr
         * @param {(string|null)} oldValue
         * @param {(string|null)} value
         */
        attributeChangedCallback(attr, oldValue, value) {
            if (attrs[attr]) {
                // _ignoreAttr exists temporarily
                // @ts-ignore
                if (attr === this._ignoreAttr || oldValue === value) return;
                // Choose the property name to send the update
                let { prop, type } = attrs[attr];
                this[prop] = transformValue(type, value);
            } else {
                // If the attribute does not exist in the scope attrs, the event is sent to super
                // @ts-ignore
                super.attributeChangedCallback(attr, oldValue, value);
            }
        }

        static get observedAttributes() {
            // See if there is an observedAttributes declaration to match with the current one
            // @ts-ignore
            let superAttrs = super.observedAttributes || [];
            for (let prop in props) {
                setPrototype(
                    Element.prototype,
                    prop,
                    props[prop],
                    attrs,
                    values
                );
            }
            return Object.keys(attrs).concat(superAttrs);
        }
    };

    return Atom;
}

/**
 * Attach the css to the shadowDom
 * @param {Base &  {shadowRoot: ShadowRoot, constructor: {_styles: Style[] }} } host
 */
function applyStyles(host) {
    let { _styles } = host.constructor;
    let { shadowRoot } = host;
    if (shadowRoot && _styles.length) {
        if (options.sheet) {
            //@ts-ignore
            shadowRoot.adoptedStyleSheets = _styles;
        } else {
            _styles.map((style) =>
                // @ts-ignore
                shadowRoot.appendChild(style.cloneNode(true))
            );
        }
    }
}

/**
 * @typedef {Object} ShadowRoot
 * @property {CSSStyleSheet[]} [adoptedStyleSheets]
 * @property {(child:ChildNode)=>void} appendChild
 */

/**
 * @typedef {typeof HTMLElement} Base
 */

/**
 * @typedef {Object} Context
 * @property {(value:any)=>void} mount
 * @property {(value:any)=>void} unmount
 * @property {Promise<void>} mounted
 * @property {Promise<void>} unmounted
 * @property {Promise<void>} updated
 * @property {()=>Promise<void>} update
 * @property {Object<string,any>} _props
 * @property {string} [_ignoreAttr]
 * @property {symbol} [symbolId]  - symbolId allows to obtain the symbol id that stores the state of the virtual-dom
 */

/**
 * @typedef {CSSStyleSheet|HTMLStyleElement} Style
 */

/**
 * @typedef { ReturnType<c> } Atom
 */

/**
 * @typedef { InstanceType< Atom > & {_ignoreAttr?: string } } AtomThis
 */
