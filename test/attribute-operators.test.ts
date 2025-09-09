import { parse } from '../src'

describe('Attribute Operators', () => {
	it('should support attribute existence selector [attr]', () => {
		const root = parse('<a href="https://example.com">Link</a><span>Text</span>');
		const result = root.querySelector('[href]');
		expect(result).toBeTruthy();
		expect(result?.tagName).toBe('a');
	});

	it('should support exact match operator [attr="value"]', () => {
		const root = parse('<input type="text" name="username"><input type="email" name="email">');
		const textInput = root.querySelector('[type="text"]');
		const emailInput = root.querySelector('[type="email"]');
		
		expect(textInput).toBeTruthy();
		expect(textInput?.attributes.type).toBe('text');
		expect(emailInput).toBeTruthy();
		expect(emailInput?.attributes.type).toBe('email');
	});

	it('should support starts with operator [attr^="value"]', () => {
		const root = parse('<a href="https://example.com">HTTPS</a><a href="http://test.com">HTTP</a>');
		const httpsLink = root.querySelector('[href^="https://"]');
		const httpLink = root.querySelector('[href^="http://"]');
		
		expect(httpsLink).toBeTruthy();
		expect(httpsLink?.attributes.href).toBe('https://example.com');
		expect(httpLink).toBeTruthy();
		expect(httpLink?.attributes.href).toBe('http://test.com');
	});

	it('should support ends with operator [attr$="value"]', () => {
		const root = parse('<a href="https://example.com">Link 1</a><a href="https://test.org">Link 2</a>');
		const comLink = root.querySelector('[href$=".com"]');
		const orgLink = root.querySelector('[href$=".org"]');
		
		expect(comLink).toBeTruthy();
		expect(comLink?.attributes.href).toBe('https://example.com');
		expect(orgLink).toBeTruthy();
		expect(orgLink?.attributes.href).toBe('https://test.org');
	});

	it('should handle .com in attribute values without treating it as class selector', () => {
		const root = parse('<a href="https://example.com">Website</a><span class="com">Not a link</span>');
		
		const result = root.querySelector('[href$=".com"]');
		expect(result).toBeTruthy();
		expect(result?.tagName).toBe('a');
		expect(result?.attributes.href).toBe('https://example.com');
		
		expect(result?.attributes.class).toBeUndefined();
	});

	it('should support contains operator [attr*="value"]', () => {
		const root = parse('<div class="btn-primary">Button 1</div><div class="btn-secondary">Button 2</div>');
		const primaryBtn = root.querySelector('[class*="primary"]');
		const secondaryBtn = root.querySelector('[class*="secondary"]');
		
		expect(primaryBtn).toBeTruthy();
		expect(primaryBtn?.attributes.class).toBe('btn-primary');
		expect(secondaryBtn).toBeTruthy();
		expect(secondaryBtn?.attributes.class).toBe('btn-secondary');
	});

	it('should support not equal operator [attr!="value"]', () => {
		const root = parse('<input type="text" name="username"><input type="hidden" name="token">');
		const notHidden = root.querySelector('[type!="hidden"]');
		const notText = root.querySelector('[type!="text"]');
		
		expect(notHidden).toBeTruthy();
    console.log(notHidden?.toString())
		expect(notHidden?.attributes.type).toBe('text');
		expect(notText).toBeTruthy();
		expect(notText?.attributes.type).toBe('hidden');
	});

	it('should support hyphen operator [attr|="value"]', () => {
		const root = parse('<span lang="en">English</span><span lang="en-US">American</span><span lang="fr">French</span>');
		const enElements = root.querySelectorAll('[lang|="en"]');
		
		expect(enElements.length).toBe(2); // en and en-US
		expect(enElements[0]?.attributes.lang).toBe('en');
		expect(enElements[1]?.attributes.lang).toBe('en-US');
	});

	it('should support word operator [attr~="value"]', () => {
		const root = parse('<div class="btn primary large">Button</div><div class="secondary small">Other</div>');
		const primaryBtn = root.querySelector('[class~="primary"]');
		const largeBtn = root.querySelector('[class~="large"]');
		
		expect(primaryBtn).toBeTruthy();
		expect(primaryBtn?.attributes.class).toBe('btn primary large');
		expect(largeBtn).toBeTruthy();
		expect(largeBtn?.attributes.class).toBe('btn primary large');
	});

	it('should support multiple attributes in same selector', () => {
		const root = parse('<input type="email" name="user-email" required>');
		const result = root.querySelector('input[type="email"][required]');
		
		expect(result).toBeTruthy();
		expect(result?.attributes.type).toBe('email');
		expect(result?.attributes.required).toBe('');
	});

	it('should support complex selectors', () => {
		const root = parse('<a href="tel:+1234567890" class="phone-link" id="phone1">Phone</a>');
		const result = root.querySelector('a.phone-link#phone1[href^="tel:"]');
		
		expect(result).toBeTruthy();
		expect(result?.tagName).toBe('a');
		expect(result?.attributes.href).toBe('tel:+1234567890');
		expect(result?.attributes.class).toBe('phone-link');
		expect(result?.id).toBe('phone1');
	});

	it('should handle empty attribute values', () => {
		const root = parse('<input value="" required class="">');
		expect(root.querySelector('[value=""]')).toBeTruthy();
		expect(root.querySelector('[required]')).toBeTruthy();
		expect(root.querySelector('[class=""]')).toBeTruthy();
		
		expect(root.querySelector('[value^=""]')).toBeTruthy();
		expect(root.querySelector('[value$=""]')).toBeTruthy();
		expect(root.querySelector('[value*=""]')).toBeTruthy();
	});

	it('should handle attribute values with special characters and dots', () => {
		const root = parse('<div data-test="hello.world-test_123" data-url="https://site.com/path.html">Content</div>');
		
		expect(root.querySelector('[data-test^="hello."]')).toBeTruthy();
		expect(root.querySelector('[data-test$="_123"]')).toBeTruthy();
		expect(root.querySelector('[data-test*="world-test"]')).toBeTruthy();
		expect(root.querySelector('[data-url$=".html"]')).toBeTruthy();
		expect(root.querySelector('[data-url*=".com"]')).toBeTruthy();
	});

	it('should handle multiple attributes with complex values', () => {
		const root = parse('<input type="email" name="user-email" data-validation="email.required" required>');
		const result = root.querySelector('input[type="email"][name^="user"][data-validation*=".required"][required]');
		
		expect(result).toBeTruthy();
		expect(result?.attributes.type).toBe('email');
		expect(result?.attributes.name).toBe('user-email');
		expect(result?.attributes['data-validation']).toBe('email.required');
		expect(result?.attributes.required).toBe('');
	});

	it('should be case sensitive for attribute names and values', () => {
		const root = parse('<div class="Test" data-value="CamelCase">Content</div>');
		
		// Attribute names are case sensitive
		expect(root.querySelector('[class="Test"]')).toBeTruthy();
		expect(root.querySelector('[CLASS="Test"]')).toBeNull();
		
		// Attribute values are case sensitive
		expect(root.querySelector('[class="Test"]')).toBeTruthy();
		expect(root.querySelector('[class="test"]')).toBeNull();
		expect(root.querySelector('[data-value^="Camel"]')).toBeTruthy();
		expect(root.querySelector('[data-value^="camel"]')).toBeNull();
	});

	it('should handle whitespace in attribute values correctly', () => {
		const root = parse('<div class=" btn  primary " title="  Hello World  ">Content</div>');
		
		// expect(root.querySelector('[class~="btn"]')).toBeTruthy();
		// expect(root.querySelector('[class~="primary"]')).toBeTruthy();
		
		expect(root.querySelector('[title^="  Hello"]')).toBeTruthy();
		// expect(root.querySelector('[title$="World  "]')).toBeTruthy();
		// expect(root.querySelector('[title*="Hello World"]')).toBeTruthy();
	});

	it('should handle hyphen operator |= edge cases', () => {
		const root = parse(`
			<span lang="en">English</span>
			<span lang="en-US">American English</span>
			<span lang="en-GB-scotland">Scottish English</span>
			<span lang="english">Not a language code</span>
			<span lang="fr">French</span>
		`);
		
		const enElements = root.querySelectorAll('[lang|="en"]');
		expect(enElements.length).toBe(3);
		
		expect(root.querySelector('[lang|="english"]')).toBeTruthy();
		expect(root.querySelectorAll('[lang|="en"]').find(el => el.attributes.lang === 'english')).toBeUndefined();
	});

	it('should handle word operator ~= edge cases', () => {
		const root = parse(`
			<div class="btn primary large">Button 1</div>
			<div class="btn secondary">Button 2</div>
			<div class="primary-btn">Button 3</div>
			<div class="btn-primary">Button 4</div>
		`);
		
		expect(root.querySelectorAll('[class~="btn"]').length).toBe(2);
		expect(root.querySelectorAll('[class~="primary"]')[0]?.text).toBe('Button 1');		
		expect(root.querySelector('[class~="primary-btn"]')?.text).toBe('Button 3');
		expect(root.querySelector('[class~="btn-primary"]')?.text).toBe('Button 4');
	});

	it('should handle quoted attribute values in selectors', () => {
		const root = parse('<div data-test=\'value with "quotes"\' title="value with \'apostrophes\'">Content</div>');
		
		expect(root.querySelector('[data-test*="quotes"]')).toBeTruthy();
		expect(root.querySelector('[title*="apostrophes"]')).toBeTruthy();
	});

	it('should handle non-existent attributes correctly', () => {
		const root = parse('<div class="test">Content</div>');
		
		expect(root.querySelector('[id]')).toBeNull();
		expect(root.querySelector('[id=""]')).toBeNull();
		expect(root.querySelector('[id^="test"]')).toBeNull();
		expect(root.querySelector('[nonexistent*="anything"]')).toBeNull();
		expect(root.querySelector('[data-missing~="word"]')).toBeNull();
	});

	it('should handle complex nested selectors with attributes', () => {
		const root = parse(`
			<article class="post">
				<header>
					<h1 class="title">Post Title</h1>
				</header>
				<div class="content">
					<p data-paragraph="1">First paragraph</p>
					<p data-paragraph="2">Second paragraph</p>
					<a href="https://example.com" target="_blank" rel="noopener">External Link</a>
					<a href="/internal.html" class="internal">Internal Link</a>
				</div>
			</article>
		`);

		expect(root.querySelector('article.post [data-paragraph="1"]')).toBeTruthy();
		expect(root.querySelector('.content a[href^="https://"][target="_blank"]')).toBeTruthy();
		expect(root.querySelector('a[href$=".html"][class="internal"]')).toBeTruthy();
		expect(root.querySelectorAll('article [data-paragraph]').length).toBe(2);
		expect(root.querySelectorAll('.content a[href]').length).toBe(2);
	});

	it('should return null for non-matching complex selectors', () => {
		const root = parse('<a href="https://example.com" class="link">Website</a>');
		
		expect(root.querySelector('a[href^="invalid:"]')).toBeNull();
		expect(root.querySelector('a[href$="invalid"]')).toBeNull();
		expect(root.querySelector('a[href*="invalid"]')).toBeNull();
		expect(root.querySelector('a[class~="invalid"]')).toBeNull();
		expect(root.querySelector('a[href^="https://"][class="invalid"]')).toBeNull();
	});

	it('should handle selectors with spaces in attribute values', () => {
		const root = parse(`
			<div title="Hello World" class="container">
				<p data-text="Multi word value">Content</p>
				<span alt="Some description here">Text</span>
			</div>
		`);
		
		// Test descendant selector with space in attribute value
		expect(root.querySelector('div[title="Hello World"] p[data-text="Multi word value"]')).toBeTruthy();
		expect(root.querySelector('div[title="Hello World"] span[alt="Some description here"]')).toBeTruthy();
		
		// Test that these selectors don't accidentally match wrong elements
		expect(root.querySelector('div[title="Hello"] p')).toBeNull();
		expect(root.querySelector('div p[data-text="Multi"]')).toBeNull();
	});
});
