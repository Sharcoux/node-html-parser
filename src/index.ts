import { decode, encode } from 'html-entities';

let debug = false

export enum NodeType {
	ELEMENT_NODE = 1,
	TEXT_NODE = 3,
	COMMENT_NODE = 8
}

export type Node = HTMLElement | TextNode | CommentNode

export type ParsingOptions = {
	lowerCaseTagName?: boolean;
	script?: boolean;
	style?: boolean;
	pre?: boolean;
	comment?: boolean;
}

/**
 * Node Class as base class for TextNode and HTMLElement.
 */
export abstract class AbstractNode {
	/** The node type.
	 * * 1 for Elements
	 * * 3 for Text Nodes
	 * * 8 for Comments
	 */
	abstract nodeType: NodeType;
	/** Return the child nodes of this node */
	childNodes = [] as Node[];
	/**
	 * Get unescaped text value of current node and its children.
	 * @return {string} text content
	 */
	get text() {
		return decode(this.rawText);
	}
	/** Return the raw text content of this node */
	abstract get rawText(): string;
	/** Return the html representation of this node */
	abstract toString(): string;
	/** Provide a stable JSON representation for test serializers */
	abstract toJSON(): unknown;
	/** Return the parent node or null if this node is the root of the tree */
	public parentNode: HTMLElement | null = null;

	/**
	 * Remove this node from its parent if any
	 * @return {Node}      node removed
	 */
	public remove() {
		if(this.parentNode) this.parentNode.removeChild(this as unknown as Node)
		return this
	}
}
/**
 * TextNode to contain a text element in DOM tree.
 * @param {string} value [description]
 */
export class TextNode extends AbstractNode {
	value: string
	constructor(value: string) {
		super();
		this.value = value;
	}

	get rawText() {
		return this.value
	}

	/**
	 * Node Type declaration.
	 * @type {Number}
	 */
	nodeType = NodeType.TEXT_NODE as const;

	/**
	 * Detect if the node contains only white space.
	 * @return {bool}
	 */
	get isWhitespace() {
		return /^(\s|&nbsp;)*$/.test(this.rawText);
	}

	toString(): string {
		return this.rawText;
	}

	toJSON() {
		return { type: 'text', value: this.value };
	}
}

export class CommentNode extends AbstractNode {
	value: string
	constructor(value: string) {
		super();
		this.value = value;
	}

	/**
	 * Node Type declaration.
	 * @type {Number}
	 */
	nodeType = NodeType.COMMENT_NODE as const;

	get rawText() {
		return this.value
	}

	toString() {
		return `<!--${this.rawText}-->`;
	}

	toJSON() {
		return { type: 'comment', value: this.value };
	}
}

const kBlockElements = {
	div: true,
	p: true,
	// ul: true,
	// ol: true,
	li: true,
	// table: true,
	// tr: true,
	td: true,
	section: true,
	br: true
};

export interface KeyAttributes {
	id?: string;
	class?: string;
}

export interface Attributes {
	[key: string]: string;
}

export interface RawAttributes {
	[key: string]: string;
}

function arr_back<T>(arr: T[]) {
	return arr[arr.length - 1];
}

/**
 * HTMLElement, which contains a set of children.
 *
 * Note: this is a minimalist implementation, no complete tree
 *   structure provided (no parentNode, nextSibling,
 *   previousSibling etc).
 * @class HTMLElement
 * @extends {AbstractNode}
 */
export class HTMLElement extends AbstractNode {
	private _attrs: Attributes | undefined;
	private _rawAttrs: RawAttributes | undefined;
	/** This is a short hand for the id attribute of this node */
	public id: string = '';
	/** This is a short hand to get the list of the class names attribute of this node */
	public classNames: string[] = [];
	/**
	 * Node Type declaration.
	 */
	public nodeType = NodeType.ELEMENT_NODE as const;
	/**
	 * Creates an instance of HTMLElement.
	 * @param [rawAttrs]	attributes in string
	 *
	 * @memberof HTMLElement
	 */
	constructor(public tagName: string, private rawAttrs = '', parentNode = null as HTMLElement | null) {
		super();
		this.rawAttrs = rawAttrs;
		this.parentNode = parentNode;
		this.childNodes = [];
		let keyAttrs = {} as KeyAttributes
		for (let attMatch; attMatch = kIdClassAttributePattern.exec(rawAttrs);) {
			const key = attMatch[2];
			if (key) keyAttrs[key as keyof KeyAttributes] = attMatch[4] || attMatch[5] || attMatch[6] || "";
		}
		if (keyAttrs.id) {
			this.id = keyAttrs.id;
		}
		if (keyAttrs.class) {
			this.classNames = keyAttrs.class.split(/\s+/);
		}
	}
	/**
	 * Remove Child element from childNodes array
	 * @param {HTMLElement} node     node to remove
	 */
	public removeChild(node: Node) {
		this.childNodes = this.childNodes.filter((child) => {
			return (child !== node);
		});
		if(node instanceof HTMLElement) node.parentNode = null
	}
	/**
	 * Exchanges given child with new child
	 * @param {HTMLElement} oldNode     node to exchange
	 * @param {HTMLElement} newNode     new node
	 */
	public exchangeChild(oldNode: Node, newNode: Node) {
		const index = this.childNodes.findIndex(node => node === oldNode)
		if(index>=0){
			this.childNodes[index] = newNode
			if(oldNode instanceof HTMLElement) oldNode.parentNode = null
		}
	}
	/**
	 * Get escpaed (as-it) text value of current node and its children.
	 * @return {string} text content
	 */
	get rawText() {
		let res = '';
		for (let i = 0; i < this.childNodes.length; i++)
			res += this.childNodes[i]!.rawText;
		return res;
	}
	/**
	 * Get structured Text (with '\n' etc.)
	 * @return {string} structured text
	 */
	get structuredText() {
		let currentBlock = [] as string[] & { prependWhitespace?: boolean };
		const blocks = [currentBlock];
		function dfs(node: Node) {
			if (node.nodeType === NodeType.ELEMENT_NODE) {
				if (kBlockElements[node.tagName as keyof typeof kBlockElements]) {
					if (currentBlock.length > 0) {
						blocks.push(currentBlock = []);
					}
					node.childNodes.forEach(dfs);
					if (currentBlock.length > 0) {
						blocks.push(currentBlock = []);
					}
				} else {
					node.childNodes.forEach(dfs);
				}
			} else if (node.nodeType === NodeType.TEXT_NODE) {
				if (node.isWhitespace) {
					// Whitespace node, postponed output
					currentBlock.prependWhitespace = true;
				} else {
					let text = node.text;
					if (currentBlock.prependWhitespace) {
						text = ' ' + text;
						currentBlock.prependWhitespace = false;
					}
					currentBlock.push(text);
				}
			}
		}
		dfs(this);
		return blocks
			.map(function (block) {
				// Normalize each line's whitespace
				return block.join('').trim().replace(/\s{2,}/g, ' ');
			})
			.join('\n').replace(/\s+$/, '');	// trimRight;
	}

	/**
	 * Returns the children of HTMLElement type (ignore text and comment nodes)
	 * @returns {HTMLElement[]}
	 */
	get children() {
		return this.childNodes.filter(child => child instanceof HTMLElement) as HTMLElement[]
	}

	public toString(): string {
		const tag = this.tagName;
		if (tag) {
			const is_self_closed = /^(img|br|hr|area|base|input|doctype|link|meta)$/i.test(tag);
			const attrs = this.rawAttrs ? ' ' + this.rawAttrs : '';
			if (is_self_closed) {
				return `<${tag}${attrs} />`;
			} else {
				return `<${tag}${attrs}>${this.innerHTML}</${tag}>`;
			}
		} else {
			return this.innerHTML;
		}
	}

	/** Retrieves the content of this node as an HTML string */
	get innerHTML() {
		return this.childNodes.map((child) => {
			return child.toString();
		}).join('');
	}

	set innerHTML(content: string) {
		const doc = parse(content)
		this.childNodes.forEach(node => node.remove())
		doc.childNodes.forEach(node => this.appendChild(node))
	}

	/** Edit the HTML content of this node */
	public set_content(content: string | Node | Node[]) {
		if (content instanceof AbstractNode) {
			content = [content];
		} else if (typeof content == 'string') {
			const r = parse(content);
			content = r.childNodes.length ? r.childNodes : [new TextNode(content)];
		}
		this.childNodes = content;
	}

	/** Convert this node into its HTML representation. This is an alias to toString() method. */
	get outerHTML() {
		return this.toString();
	}

	/**
	 * Trim element from right (in block) after seeing pattern in a TextNode.
	 * @param  {RegExp} pattern pattern to find
	 * @return {HTMLElement}    reference to current node
	 */
	public trimRight(pattern: RegExp) {
		for (let i = 0; i < this.childNodes.length; i++) {
			const childNode = this.childNodes[i]!;
			if (childNode.nodeType === NodeType.ELEMENT_NODE) {
				childNode.trimRight(pattern);
			} else {
				const index = childNode.rawText.search(pattern);
				if (index > -1) {
					childNode.value = childNode.rawText.substr(0, index);
					// trim all following nodes.
					this.childNodes.length = i + 1;
				}
			}
		}
		return this;
	}
	/**
	 * Get DOM structure
	 * @return {string} strucutre
	 */
	get structure() {
		const res = [] as string[];
		let indention = 0;
		function write(str: string) {
			res.push('  '.repeat(indention) + str);
		}
		function dfs(node: HTMLElement) {
			const idStr = node.id ? ('#' + node.id) : '';
			const classStr = node.classNames.length ? ('.' + node.classNames.join('.')) : '';
			write(node.tagName + idStr + classStr);
			indention++;
			for (let i = 0; i < node.childNodes.length; i++) {
				const childNode = node.childNodes[i]!;
				if (childNode.nodeType === NodeType.ELEMENT_NODE) {
					dfs(childNode);
				} else if (childNode.nodeType === NodeType.TEXT_NODE) {
					if (!(childNode).isWhitespace)
						write('#text');
				}
			}
			indention--;
		}
		dfs(this);
		return res.join('\n');
	}

	/**
	 * Remove whitespaces in this sub tree.
	 * @return {HTMLElement} pointer to this
	 */
	public removeWhitespace() {
		let o = 0;
		for (let i = 0; i < this.childNodes.length; i++) {
			const node = this.childNodes[i]!;
			if (node.nodeType === NodeType.TEXT_NODE) {
				if (node.isWhitespace)
					continue;
				node.value = node.rawText.trim();
			} else if (node.nodeType === NodeType.ELEMENT_NODE) {
				node.removeWhitespace();
			}
			this.childNodes[o++] = node;
		}
		this.childNodes.length = o;
		return this;
	}

	/**
	 * Query CSS selector to find matching nodes.
	 * @param  {string}         selector Simplified CSS selector
	 * @param  {Matcher}        selector A Matcher instance
	 * @return {HTMLElement[]}  matching elements
	 */
	public querySelectorAll(selector: string | Matcher): HTMLElement[] {
		let matcher: Matcher;
		if (selector instanceof Matcher) {
			matcher = selector;
			matcher.reset();
			return this.querySelectorImpl(selector, true)
		} else {
			const parts = selector.split(',').filter(part => part.trim()).map(part => part.trim())
			const result = new Set<HTMLElement>(parts.map(part => this.querySelectorImpl(new Matcher(part), true)).flat())
			return Array.from(result)
		}
	}

	/**
	 * Query CSS selector implementation
	 * @param matcher The matcher to use for selection
	 * @param all Whether to return all matches or just the first one
	 */
	private querySelectorImpl(matcher: Matcher, all: true): HTMLElement[];
	private querySelectorImpl(matcher: Matcher, all: false): HTMLElement | null;
	private querySelectorImpl(matcher: Matcher, all: boolean): HTMLElement[] | HTMLElement | null {
		function explore(node: HTMLElement, currentMatcher: Matcher, all: true): HTMLElement[]
		function explore(node: HTMLElement, currentMatcher: Matcher, all: false): HTMLElement | null
		function explore(node: HTMLElement, currentMatcher: Matcher, all: boolean): HTMLElement[] | HTMLElement | null {
			if (debug) console.log('exploring:', node.toString().replace(/\s+/g, ' '), 'matcher level:', currentMatcher.level);
			
			const advanced = node.tagName ? currentMatcher.advance(node) : false;
			if (debug) console.log('advanced:', advanced, 'matched:', currentMatcher.matched);

			// If we look for a single node and we found it, return it
			if (!all && advanced && currentMatcher.matched) return node;

			// If we look for all matching nodes and advanced the matcher, we need to create a new matcher to explore the descendants
			// with the same level too
			else if (advanced && all) {
				const clonedMatcher = currentMatcher.clone()
				clonedMatcher.rewind()
				const childrenResults = node.children.map(child => explore(child, clonedMatcher.clone(), true)).flat()
				if (currentMatcher.matched) return [node, ...childrenResults]
				else return childrenResults.concat(...node.children.map(child => explore(child, currentMatcher.clone(), true)).flat())
			}
			// If we look for all nodes but we didn't advance the matcher, we need to explore the children
			else if (all) return node.children.map(child => explore(child, currentMatcher.clone(), true)).flat();
			// If we look for a single node and didn't advance the matcher, find the target in the children
			else {
				for (const child of node.children) {
					const result = explore(child, currentMatcher.clone(), false);
					if (result) return result;
				}
				return null;
			}
		};
		
		return all ? explore(this, matcher, true) : explore(this, matcher, false);
	}

	/**
	 * Query CSS Selector to find matching node.
	 * @param  {string}         selector Simplified CSS selector
	 * @param  {Matcher}        selector A Matcher instance
	 * @return {HTMLElement | null}    matching node or null if not found
	 */
	public querySelector(selector: string | Matcher): HTMLElement | null {
		let matcher: Matcher;
		if (selector instanceof Matcher) {
			matcher = selector;
			matcher.reset();
			return this.querySelectorImpl(selector, false)
		} else {
			const parts = selector.split(',').map(part => part.trim()).filter(part => part.length)
			for (const part of parts) {
				const result = this.querySelectorImpl(new Matcher(part), false)
				if (result) return result
			}
			return null
		}
	}

	/**
	 * Append a child node to childNodes
	 * @param  {Node} node node to append
	 * @return {Node}      node appended
	 */
	public appendChild<T extends Node = Node>(node: T) {
		this.childNodes.push(node);
		if (node instanceof HTMLElement) {
			node.parentNode = this;
		}
		return node;
	}

	/**
	 * Append a child node to childNodes
	 * @param  {Node} node node to prepend
	 * @return {Node}      node prepended
	 */
	public prependChild<T extends Node = Node>(node: T) {
		this.childNodes.unshift(node);
		if (node instanceof HTMLElement) {
			node.parentNode = this;
		}
		return node;
	}

	/**
	 * Get first child node
	 * @return {Node} first child node
	 */
	get firstChild() {
		return this.childNodes[0]!;
	}

	/**
	 * Get last child node
	 * @return {Node} last child node
	 */
	get lastChild() {
		return arr_back(this.childNodes)!;
	}

	/**
	 * Get attributes
	 * @return {Object} parsed and unescaped attributes
	 */
	get attributes() {
		if (this._attrs)
			return this._attrs;
		this._attrs = {} as Attributes & { [Symbol.iterator]?: () => Iterator<{ name: string; value: string }> };
		const attrs = this.rawAttributes;
		for (const key in attrs) {
			this._attrs[key] = decode(attrs[key]);
		}
		// Make attributes iterable (non-enumerable) to avoid pretty-format DOM plugin crashes
		if (!(this._attrs as any)[Symbol.iterator]) {
			Object.defineProperty(this._attrs, Symbol.iterator, {
				value: function* () {
					for (const key of Object.keys(this)) {
						yield { name: key, value: (this as any)[key] };
					}
				},
				enumerable: false,
				configurable: true
			});
		}
		return this._attrs;
	}

	/**
	 * Get an attribute value
	 * @param {string} key The attribute name
	 * @return {string | undefined} The attribute value
	 */
	getAttribute(key: string): string | undefined {
		return this.attributes[key];
	}

	/**
	 * Get escaped (as-it) attributes
	 * @return {Object} parsed attributes
	 */
	get rawAttributes() {
		if (this._rawAttrs)
			return this._rawAttrs;
		const attrs = {} as RawAttributes;
		if (this.rawAttrs) {
			let match: RegExpExecArray | null;
			while (match = kAttributePattern.exec(this.rawAttrs)) {
				const key = match[1];
				const value = match[4] || match[5] || match[6] || "";
				if (key) attrs[key] = value;
			}
		}
		this._rawAttrs = attrs;
		return attrs;
	}

	/**
	 * Set an attribute value to the HTMLElement
	 * @param {string} key The attribute name
	 * @param {string | undefined} value The value to set, or undefined to remove an attribute
	 */
	setAttribute(key: string, value: string | undefined) {
		//Update the id property
		if (key === "id") {
			this.id = value || '';
		}
		//Update the classNames
		else if (key === "class") {
			this.classNames = value?.split(/\s+/) || [];
		}
		//Update the attributes map
		const attrs = this.attributes;
		if (value === undefined) delete attrs[key];
		else attrs[key] = value + '';
		//Update the raw attributes
		if (this._rawAttrs) {
			if (value === undefined) delete this._rawAttrs[key];
			else this._rawAttrs[key] = encode(value + '');
		}
		//Update rawString
		this.rawAttrs = Object.keys(attrs).map(attr => attr + (attrs[attr] === '' ? '' : ('="' + encode(attrs[attr]) + '"'))).join(' ');
	}

	removeAttribute(key: string) {
		this.setAttribute(key, undefined)
	}

	/**
	 * Replace all the attributes of the HTMLElement by the provided attributes
	 * @param {Attributes} attributes the new attribute set
	 */
	setAttributes(attributes: Attributes) {
		//Update the id property
		if (attributes.id) {
			this.id = attributes.id;
		}
		//Update the classNames
		else if (attributes.class) {
			this.classNames = attributes.class.split(/\s+/);
		}
		//Update the attributes map
		if (this.attributes) {
			Object.keys(this.attributes).forEach(key => delete this.attributes[key]);
			Object.keys(attributes).forEach(key => this.attributes[key] = attributes[key] + '');
		}
		//Update the raw attributes map
		if (this.rawAttributes) {
			Object.keys(this.rawAttributes).forEach(key => delete this.rawAttributes[key]);
			Object.keys(attributes).forEach(key => this.rawAttributes[key] = encode(attributes[key] + ''));
		}
		//Update rawString
		this.rawAttrs = Object.keys(attributes).map(attr => attr + (attributes[attr] === '' ? '' : ('="' + encode(attributes[attr] + '') + '"'))).join(' ');
	}

	toJSON() {
		return {
			type: 'element',
			tagName: this.tagName,
			attributes: this.attributes,
			children: this.childNodes.map((c) => (c as any).toJSON ? (c as any).toJSON() : c.toString())
		};
	}
}

// Removed old complex function cache system - now using simple composed functions in Matcher class

/**
 * Matcher class to make CSS match
 *
 * @class Matcher
 */
export class Matcher {
	private checkers: Array<(el: HTMLElement) => boolean> = [];
	private nextMatch = 0;

	/**
	 * Creates an instance of Matcher.
	 * @param {string} selector
	 */
	constructor(selector: string) {
		this.checkers = selector ? this.parseCompleteSelector(selector) : [];
	}

	/**
	 * Parse complete CSS selector using regex to extract all parts
	 */
	private parseCompleteSelector(selector: string): Array<(el: HTMLElement) => boolean> {
		// Regex to match complete selector parts (tag#id.class1.class2[attr1][attr2])
		// This captures each descendant selector part as a whole
		const selectorPartRegex = /(?:^|\s+)([a-zA-Z_*][\w:-]*)?(?:#([\w-]+))?(?:\.([\w-]+(?:\.[\w-]+)*))?(\[(?:[^\]]+)\](?:\[(?:[^\]]+)\])*)?/g;
		
		const parsedSelectors = [];
		let match;
		while ((match = selectorPartRegex.exec(selector)) !== null) {
			if (match[0].trim()) { // Skip empty matches
				parsedSelectors.push({
					tag: match[1] || '',
					id: match[2] || '',
					classes: match[3] ? match[3].split('.') : [],
					attrs: this.parseAttributes(match[4] || '')
				});
			}
		}

		return parsedSelectors.map(part => this.createCheckerFromParsed(part));
	}

	/**
	 * Parse attributes string like "[attr1][attr2=value]" into structured data
	 */
	private parseAttributes(attrsString: string): Array<{ key: string; op: string; value: string }> {
		if (!attrsString) return [];
		
		const attrs: Array<{ key: string; op: string; value: string }> = [];
		const attrRegex = /\[([^\s~|^$*!=]+)(?:\s*(=|!=|\^=|\$=|\*=|\|=|~=)\s*(?:["']?([^"'\]]*)["']?)?)?\]/g;
		
		let match;
		while ((match = attrRegex.exec(attrsString)) !== null) {
			if (match[1]) {
				attrs.push({
					key: match[1],
					op: match[2] || '',
					value: match[3] || ''
				});
			}
		}
		
		return attrs;
	}

	/**
	 * Create a checker function from parsed selector data
	 */
	private createCheckerFromParsed(parsed: {
		tag: string;
		id: string;
		classes: string[];
		attrs: Array<{ key: string; op: string; value: string }>;
	}): (el: HTMLElement) => boolean {
		// Create array of check functions - only for what's needed
		const checks: Array<(element: HTMLElement) => boolean> = [];
		
		if (parsed.tag && parsed.tag !== '*') checks.push(element => element.tagName === parsed.tag);
		if (parsed.id) checks.push(element => element.id === parsed.id);
		
		if (parsed.classes.length > 0) {
			for (const cls of parsed.classes) {
				checks.push(element => element.classNames.includes(cls));
			}
		}
		
		if (parsed.attrs.length > 0) {
			const attrChecks = parsed.attrs.map(attr => this.createAttributeChecker(attr.key, attr.op, attr.value));
			checks.push(element => attrChecks.every(check => check(element)));
		}
		
		// Return a function that checks all conditions
		return element => checks.every(check => check(element));
	}

	/**
	 * Create attribute checker function
	 */
	private createAttributeChecker(attrKey: string, operator: string, value: string): (element: HTMLElement) => boolean {
		switch (operator) {
			case '=':
				return element => element.attributes[attrKey] === value;
			case '!=':
				return element => element.attributes[attrKey] !== value;
			case '^=':
				return element => {
					const attrValue = element.attributes[attrKey];
					return attrValue !== undefined && attrValue.startsWith(value);
				};
			case '$=':
				return element => {
					const attrValue = element.attributes[attrKey];
					return attrValue !== undefined && attrValue.endsWith(value);
				};
			case '*=':
				return element => {
					const attrValue = element.attributes[attrKey];
					return attrValue !== undefined && attrValue.includes(value);
				};
			case '|=':
				return element => {
					const attrValue = element.attributes[attrKey];
					return attrValue !== undefined && (attrValue === value || attrValue.startsWith(value + '-'));
				};
			case '~=':
				return element => {
					const attrValue = element.attributes[attrKey];
					return attrValue !== undefined && attrValue.split(/\s+/).includes(value);
				};
			default:
				return element => element.attributes[attrKey] !== undefined;
		}
	}

	/**
	 * Trying to advance match pointer
	 * @param  {HTMLElement} el element to make the match
	 * @return {bool}           true when pointer advanced.
	 */
	advance(el: HTMLElement): boolean {
		if (this.nextMatch < this.checkers.length && this.checkers[this.nextMatch]!(el)) {
			this.nextMatch++;
			return true;
		}
		return false;
	}

	/**
	 * Rewind the match pointer
	 */
	rewind(): void {
		this.nextMatch--;
	}

	/**
	 * Trying to determine if match made.
	 * @return {bool} true when the match is made
	 */
	get matched(): boolean {
		return this.nextMatch === this.checkers.length;
	}

	/**
	 * Reset match pointer.
	 */
	reset(): void {
		this.nextMatch = 0;
	}

	/**
	 * Get current match level (for debugging)
	 */
	get level(): number {
		return this.nextMatch;
	}

	/**
	 * Clone this matcher with current state
	 */
	clone(): Matcher {
		const cloned = new Matcher(''); // Empty selector, we'll copy the checkers
		cloned.checkers = this.checkers;
		cloned.nextMatch = this.nextMatch;
		return cloned;
	}
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
const kMarkupPattern = /<!--[^]*?(?=-->)-->|<(\/?)([a-z][-.:0-9_a-z]*)((\s*(?:[a-z][-.:0-9_a-z]*(\s*=\s*("[^"]*?"|'([^']*?')|([^<\/>]+)))?|[^<\/>\s]+))*)\s*(\/?)>/ig;
const kIdClassAttributePattern = /(^|\s)(id|class)\s*=\s*("([^"]+)"|'([^']+)'|(\S+))/ig;
const kAttributePattern = /([a-z][-.:0-9_a-z]*)(\s*=\s*("([^"]*)"|'([^']*)'|(\S+)))?/ig
const kSelfClosingElements = {
	area: true,
	base: true,
	br: true,
	col: true,
	hr: true,
	img: true,
	input: true,
	link: true,
	meta: true,
	source: true
};
const kElementsClosedByOpening = {
	li: { li: true },
	p: { p: true, h1: true, h2: true, h3: true, h4: true, h5: true, h6: true },
	b: { div: true },
	td: { td: true, th: true },
	th: { td: true, th: true },
	h1: { p: true, h1: true, h2: true, h3: true, h4: true, h5: true, h6: true },
	h2: { p: true, h1: true, h2: true, h3: true, h4: true, h5: true, h6: true },
	h3: { p: true, h1: true, h2: true, h3: true, h4: true, h5: true, h6: true },
	h4: { p: true, h1: true, h2: true, h3: true, h4: true, h5: true, h6: true },
	h5: { p: true, h1: true, h2: true, h3: true, h4: true, h5: true, h6: true },
	h6: { p: true, h1: true, h2: true, h3: true, h4: true, h5: true, h6: true },
	// Table elements
	colgroup: { tr: true, thead: true, tbody: true, tfoot: true },
	tr: { tr: true, thead: true, tbody: true, tfoot: true },
	thead: { tr: true, thead: true, tbody: true, tfoot: true },
	tbody: { tr: true, thead: true, tbody: true, tfoot: true },
	tfoot: { tr: true, thead: true, tbody: true, tfoot: true },
	// List elements
	ul: { ul: true, ol: true },
	ol: { ol: true, ul: true },
	// Section elements
	aside: { aside: true },
	nav: { nav: true },
	// Form elements
	form: { form: true },
	// Header elements
	header: { header: true },
	footer: { footer: true },
	main: { main: true }
};
const kBlockTextElements = {
	script: true,
	noscript: true,
	style: true,
	pre: true
};

/**
 * Parses HTML and returns a root element
 * Parse a chuck of HTML source.
 * @param  {string} data      html
 * @return {HTMLElement}      root fictive element. The parsed HTML can be found inside the root.childNodes property
 */
export function parse(data: string, options?: ParsingOptions) {
	const root = new HTMLElement('') as HTMLElement & { valid: boolean; };
	let currentParent: HTMLElement = root;
	const stack: HTMLElement[] = [root];
	let lastTextPos = 0;
	options = options || {};
	let match: RegExpExecArray | null;
	while (match = kMarkupPattern.exec(data)) {
		if(debug) console.log('match', match[0])
		// Add the text from the last tag or the start of the string until the new tag found (if not empty)
		if (lastTextPos + match[0].length < kMarkupPattern.lastIndex) {
			const text = data.substring(lastTextPos, kMarkupPattern.lastIndex - match[0].length);
			if(debug) console.log('text node', text)
			currentParent.appendChild(new TextNode(text));
		}

		lastTextPos = kMarkupPattern.lastIndex;

		// Add Comment nodes
		if (match[0][1] == '!') {
			if (options.comment) {
				// Only keep what is in between <!-- and -->
				const text = data.substring(lastTextPos - 3, lastTextPos - match[0].length + 4);
				if(debug) console.log('comment node', text)
				currentParent.appendChild(new CommentNode(text));
			}
			continue;
		}
		if (options.lowerCaseTagName)
			match[2] = match[2]?.toLowerCase() || '';

		// Handle opening tags (not </ tags)
		if (!match[1]) {
			if (!match[9] && kElementsClosedByOpening[currentParent.tagName as keyof typeof kElementsClosedByOpening]) {
				if (kElementsClosedByOpening[currentParent.tagName as 'li'][match[2] as 'li']) {
					if(debug) console.log('closed', currentParent.tagName, 'when opening', match[2])
					stack.pop();
					currentParent = arr_back(stack) || root;
				}
			}
			if(debug) console.log('add', match[2], 'tag to the stack')
			currentParent = currentParent.appendChild(
				new HTMLElement(match[2] || '', match[3]?.trim() || ''));
			stack.push(currentParent);
			if (kBlockTextElements[match[2] as keyof typeof kBlockTextElements]) {
				// a little test to find next </script> or </style> ...
				let closeMarkup = '</' + match[2] + '>';
				let index = data.indexOf(closeMarkup, kMarkupPattern.lastIndex);
				if (options[match[2] as keyof typeof options]) {
					let text: string;
					if (index == -1) {
						// there is no matching ending for the text element.
						text = data.substr(kMarkupPattern.lastIndex);
					} else {
						text = data.substring(kMarkupPattern.lastIndex, index);
					}
					if (text.length > 0) {
						if(debug) console.log('add text node as child of', match[2])
						currentParent.appendChild(new TextNode(text));
					}
				}
				if (index == -1) {
					lastTextPos = kMarkupPattern.lastIndex = data.length + 1;
				} else {
					lastTextPos = kMarkupPattern.lastIndex = index + closeMarkup.length;
					match[1] = 'true';
				}
			}
		}

		// Handle self closing tags and explicit closing tags
		const closingTag = match[2] as keyof typeof kSelfClosingElements
		if (match[1] || match[9] ||
			kSelfClosingElements[closingTag]) {
			const isClosingTag = !!match[1];
			const isVoidTag = !!kSelfClosingElements[closingTag];
			// Ignore invalid closing tags for void elements like </col>
			if (isClosingTag && isVoidTag) {
				continue;
			}
			// </ or /> or <br> etc.
			while (true) {
				if (currentParent.tagName == closingTag) {
					if(debug) console.log('met the end of', closingTag)
					stack.pop();
					currentParent = arr_back(stack) || root;
					break;
				} else if (stack.length > 1) {
					// Close unclosed child tag before closing the parent
					// This handles cases like <a><b>text</a> where <b> should be closed before </a>
					if(debug) console.log('closing unclosed child tag', currentParent.tagName, 'before closing', closingTag)
					stack.pop();
					currentParent = arr_back(stack) || root;
					continue;
				} else {
					// No matching tag found to close, exit the loop
					break;
				}
			}
		}
	}

	// Add the last characters as TextNode if they are remaining characters outside any tag
	if (lastTextPos < data.length) {
		if(debug) console.log('Final text node', data.substring(lastTextPos))
		root.appendChild(new TextNode(data.substring(lastTextPos)))
	}

	// Handle malformed html
	root.valid = stack.length === 1;
	while (stack.length > 1) {
		// Handle each error elements.
		const last = stack.pop()!;
		const oneBefore = arr_back(stack) || root;
		if (last.parentNode && last.parentNode instanceof HTMLElement && last.parentNode.parentNode) {
			if (last.parentNode === oneBefore && last.tagName === oneBefore.tagName) {
				if(debug) console.log(last.tagName, 'is probably supposed to close', oneBefore.tagName)
				// Pair error case <h3> <h3> handle : Fixes to <h3> </h3>
				oneBefore.removeChild(last);
				last.childNodes.forEach((child) => {
					(oneBefore.parentNode as HTMLElement).appendChild(child);
				});
				stack.pop();
			} else {
				// Single error  <div> <h3> </div> handle: Just removes <h3>
				if(debug) console.log('no close tag found for', last.tagName, '. Removing')
				oneBefore.removeChild(last);
				last.childNodes.forEach((child) => {
					oneBefore.appendChild(child);
				});
			}
		} else {
			// If it's final element just skip.
		}
	}
	return root;
}

const blockTags = [
  'html',
  'body',
  'address',
  'article',
  'aside',
  'blockquote',
  'canvas',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'noscript',
  'ol',
  'p',
  'pre',
  'section',
  'tfoot',
  'table',
  'tbody',
  'ul',
  'video',
  'th',
  'td',
  'tr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
] as const
type BlockTag = typeof blockTags[number]

/**
 * Is the provided node a block element
 * @param node The node to consider
 * @returns true if the tagname of this node is of type block (p, ol, ul, h1, etc)
 */
export function isBlock(node: { nodeType: NodeType; tagName: string }) {
  return (
    node.nodeType === NodeType.ELEMENT_NODE &&
    node.tagName &&
    blockTags.includes(node.tagName.toLowerCase() as BlockTag)
  )
}
