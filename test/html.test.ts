import fs from 'fs'
import { Matcher, HTMLElement, TextNode, CommentNode, parse } from '../src'

describe('HTML Parser', () => {

	describe('Matcher', () => {
		it('should match correct elements', () => {
			const matcher = new Matcher('#id .a a.b *.a.b .a.b * a');
			const MatchesNothingButStarEl = new HTMLElement('_');
			const withIdEl = new HTMLElement('p', "id='id'");
			const withClassNameEl = new HTMLElement('a', "class='a b'");

			expect(matcher.advance(MatchesNothingButStarEl)).toBeFalsy(); // #id
			expect(matcher.advance(withClassNameEl)).toBeFalsy(); // #id
			expect(matcher.advance(withIdEl)).toBeTruthy(); // #id

			expect(matcher.advance(MatchesNothingButStarEl)).toBeFalsy(); // .a
			expect(matcher.advance(withIdEl)).toBeFalsy(); // .a
			expect(matcher.advance(withClassNameEl)).toBeTruthy(); // .a

			expect(matcher.advance(MatchesNothingButStarEl)).toBeFalsy(); // a.b
			expect(matcher.advance(withIdEl)).toBeFalsy(); // a.b
			expect(matcher.advance(withClassNameEl)).toBeTruthy(); // a.b

			expect(matcher.advance(withIdEl)).toBeFalsy(); // *.a.b
			expect(matcher.advance(MatchesNothingButStarEl)).toBeFalsy(); // *.a.b
			expect(matcher.advance(withClassNameEl)).toBeTruthy(); // *.a.b

			expect(matcher.advance(withIdEl)).toBeFalsy(); // .a.b
			expect(matcher.advance(MatchesNothingButStarEl)).toBeFalsy(); // .a.b
			expect(matcher.advance(withClassNameEl)).toBeTruthy(); // .a.b

			expect(matcher.advance(withIdEl)).toBeTruthy(); // *
			matcher.rewind();
			expect(matcher.advance(MatchesNothingButStarEl)).toBeTruthy(); // *
			matcher.rewind();
			expect(matcher.advance(withClassNameEl)).toBeTruthy(); // *

			expect(matcher.advance(withIdEl)).toBeFalsy(); // a
			expect(matcher.advance(MatchesNothingButStarEl)).toBeFalsy(); // a
			expect(matcher.advance(withClassNameEl)).toBeTruthy(); // a

			expect(matcher.matched).toBeTruthy();
		});
	});

	describe('parse()', () => {
		it('should parse "<p id=\\"id\\"><a class=\'cls\'>Hello</a><ul><li><li></ul><span></span></p>" and return root element', () => {

			const root = parse('<p id="id"><a class=\'cls\'>Hello</a><ul><li><li></ul><span></span></p>');

			const p = new HTMLElement('p', 'id="id"');
			p.appendChild(new HTMLElement('a', 'class=\'cls\''))
				.appendChild(new TextNode('Hello'));
			const ul = p.appendChild(new HTMLElement('ul'));
			ul.appendChild(new HTMLElement('li'));
			ul.appendChild(new HTMLElement('li'));
			p.appendChild(new HTMLElement('span'));

			root.firstChild.parentNode = null
			expect(root.firstChild).toEqual(p);
		});

		it('should parse "<DIV><a><img/></A><p></P></div>" and return root element', () => {

			const root = parse('<DIV><a><img/></A><p></P></div>', {
				lowerCaseTagName: true
			});

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));
			a.appendChild(new HTMLElement('img'));
			div.appendChild(new HTMLElement('p'));

			root.firstChild.parentNode = null
			expect(root.firstChild).toEqual(div);

		});

		it('should parse "<div><a><img/></a><p></p></div>" and return root element', () => {

			const root = parse('<div><a><img/></a><p></p></div>');

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));
			a.appendChild(new HTMLElement('img'));
			div.appendChild(new HTMLElement('p'));

			root.firstChild.parentNode = null
			expect(root.firstChild).toEqual(div);

		});

		it('should parse "<tr><th></th></tr>" and return root element', () => {
			const a = `<tr><th></th></tr>`
			const root = parse(a);
			expect(root.firstChild.toString()).toEqual(a);
		});

		it('should parse text node and return root element', () => {
			const root = parse('this is text<br />');
			expect(root.outerHTML).toEqual('this is text<br />');
		});

		it('should parse text with 2 br tags and return root element', () => {
			const root = parse('this is text<br /> with 2<br />');
			expect(root.outerHTML).toEqual('this is text<br /> with 2<br />');
		});

		it('should parse text nodes and return a root element containing the text node as only child', () => {
			const root = parse('text node');

			const textNode = new TextNode('text node')

			expect(root.firstChild).toEqual(textNode)
		})

		it('should parse "<div><a><!-- my comment --></a></div>" and return root element without comments', () => {
			const root = parse('<div><a><!-- my comment --></a></div>');

			const div = new HTMLElement('div');
			div.appendChild(new HTMLElement('a'));

			root.firstChild.parentNode = null
			expect(root.firstChild).toEqual(div);
		});

		it('should parse "<div><a><!-- my comment --></a></div>" and return root element with comments', () => {
			const root = parse('<div><a><!-- my comment --></a></div>', { comment: true });

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));
			a.appendChild(new CommentNode(' my comment '));

			root.firstChild.parentNode = null
			expect(root.firstChild).toEqual(div);
		});

		it('should not parse HTML inside comments', () => {
			const root = parse('<div><!--<a></a>--></div>', { comment: true });

			const div = new HTMLElement('div');
			div.appendChild(new CommentNode('<a></a>'));

			root.firstChild.parentNode = null
			expect(root.firstChild).toEqual(div);
		});

		it('should set the parent when adding nodes', () => {
			const root = parse('<div>a</div><div>b</div>', { comment: true });
			expect(root.firstChild.parentNode).toEqual(root);
		});

		it('should parse picture element', () => {

			const root = parse('<picture><source srcset="/images/example-1.jpg 1200w, /images/example-2.jpg 1600w" sizes="100vw"><img src="/images/example.jpg" alt="Example"/></picture>');

			const picture = new HTMLElement('picture');
			picture.appendChild(new HTMLElement('source', 'srcset="/images/example-1.jpg 1200w, /images/example-2.jpg 1600w" sizes="100vw"'));
			picture.appendChild(new HTMLElement('img', 'src="/images/example.jpg" alt="Example"'));

			root.firstChild.parentNode = null
			expect(root.firstChild).toEqual(picture);
		});

		it('should not extract text in script and style by default', () => {

			const root = parse('<script>1</script><style>2</style>');

			expect(root.firstChild.childNodes).toHaveLength(0);
			expect(root.lastChild.childNodes).toHaveLength(0);

		});

		it('should extract text in script and style when ask so', () => {

			const root = parse('<script>1</script><style>2&amp;</style>', {
				script: true,
				style: true
			});

			expect(root.firstChild.childNodes).not.toHaveLength(0);
			expect(root.firstChild.childNodes).toEqual([new TextNode('1')]);
			expect(root.firstChild.text).toEqual('1');
			expect(root.lastChild.childNodes).not.toHaveLength(0);
			expect(root.lastChild.childNodes).toEqual([new TextNode('2&amp;')]);
			expect(root.lastChild.text).toEqual('2&');
			expect(root.lastChild.rawText).toEqual('2&amp;');
		});

		it('should be able to parse "html/incomplete-script" file', () => {

			parse(fs.readFileSync(__dirname + '/html/incomplete-script').toString(), {
				script: true
			});

		});

		it('should be able to parse namespaces', () => {
			const namespacedXML = '<ns:identifier>content</ns:identifier>';
			expect(parse(namespacedXML).toString()).toEqual(namespacedXML);
		});

		it('should parse "<div><a><img/></a><p></p></div>.." very fast', () => {

			for (let i = 0; i < 100; i++)
				parse('<div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div>');

		});

		it('should parse "<DIV><a><img/></A><p></P></div>.." fast', () => {

			for (let i = 0; i < 100; i++)
				parse('<DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div>', {
					lowerCaseTagName: true
				});

		});

		it('should parse nested elements', () => {
			const html = `
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
			`
			const root = parse(html);
			expect(root.toString()).toBe(html);
		})

		// Should parse self closing tags.

		it('should parse self closing tag', () => {
			expect(parse("<img src=\"test.jpg\">").toString()).toEqual("<img src=\"test.jpg\" />");
			expect(parse("<meta charset=\"utf-8\" \>").toString()).toEqual("<meta charset=\"utf-8\" />");
		});

		// Test for broken tags. <h3>something<h3>

		it('should parse "<div><h3>content<h3> <span> other <span></div>" (fix h3, span closing tag) very fast', () => {
			parse(fs.readFileSync(__dirname + '/html/incomplete-script').toString());
		});

		// Test for values of attributes that include >

		it('should parse "<div attr=">"></div>"', () => {
			const root = parse("<div attr='>'></div>")
			const child = root.firstChild as HTMLElement
			expect(child.tagName).toEqual("div")
			expect(child.attributes.attr).toEqual(">")
		})

		it('should parse nested nodes', () => {
			const html = `<body>
	<section>
		<section>word</section>
	</section>
	<p>test</p>
</body>`
			const root = parse(html);
			expect(root.outerHTML).toEqual(html);
		});

		it('should parse malformed attributes : <span id="tree-title-end" class="editable" "=""></span>', () => {
			const root = parse("<span id='tree-title-end' ;=\"\" test='a' \"random text\" 'more text' \"=\"\" '=' class='editable'></span>")
			const child = root.firstChild as HTMLElement
			expect(child.tagName).toEqual("span")
			expect(child.attributes.id).toEqual("tree-title-end")
			expect(child.attributes.class).toEqual("editable")
			expect(child.attributes['class']).toEqual("editable")
			expect(child.attributes['id']).toEqual("tree-title-end")
		})

		it('should parse malformed attributes : <img src="https://bienalecole.fr/wp-content/uploads/2023/05/icon1.png" "="">', () => {
			const root = parse("<img src=\"https://bienalecole.fr/wp-content/uploads/2023/05/icon1.png\" \"=\"\">")
			const child = root.firstChild as HTMLElement
			expect(child.tagName).toEqual("img")
			expect(child.attributes.src).toEqual("https://bienalecole.fr/wp-content/uploads/2023/05/icon1.png")
			expect(child.attributes['src']).toEqual("https://bienalecole.fr/wp-content/uploads/2023/05/icon1.png")
		})

		it('should parse multiline svg :', () => {
			const root = parse(`<svg viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
        d="M14.0669 1.66309L2.03027 13.259"
    />
    <path
        d="M2.03027 1.66309L14.0669 13.259"
    />
</svg>
`)
			const child = root.firstChild as HTMLElement
			expect(child.tagName).toEqual("svg")
			expect(child.children.length).toBe(2)
		})

		it('Make sure that the root element has a tagName', () => {
			const root = parse('')
			expect(root.tagName).toEqual('')
		});
		
		it ('should parse Table', () => {
			const root = parse(`<table data-id="390643da-3423-45a4-9922-4f408258a0d6" data-plugin-name="table">
		<colgroup>
			<col style=""></col>
			<col style=""></col>
		</colgroup>
		<tr>
			<td><p>content 1</p></td>
			<td><p>content 2</p></td>
		</tr>
		<tr>
			<td><p>content 3</p></td>
			<td><p>content 4</p></td>
		</tr>
	</table>`)
			expect(root.children[0]!.children.map(child => child.tagName).join(',')).toEqual('colgroup,tr,tr')
		});

		it('should parse tags with namespace', () => {
			const root = parse(`<ns:identifier>content</ns:identifier>`)
			expect(root.querySelector('ns:identifier')?.toString()).toBe('<ns:identifier>content</ns:identifier>')
		})
	})

	describe('parseWithValidation', () => {
		// parse with validation tests

		it('should return Object with valid: true.  does not count <p><p></p> as error. instead fixes it to <p></p><p></p>', () => {
			const result = parse('<p><p></p>');
			expect(result.valid).toEqual(true);
			expect(result.toString()).toEqual('<p></p><p></p>')
		})

		it('should return Object with valid: true.  does not count <p><p/></p> as error. instead fixes it to <p><p></p></p>', () => {
			const result = parse('<p><p/></p>');
			expect(result.valid).toEqual(true);
			expect(result.toString()).toEqual('<p><p></p></p>')
		})

		it('should return Object with valid: true.  does not count <p><h3></p> as error', () => {
			const result = parse('<p><h3></p>');
			expect(result.valid).toEqual(true);
			expect(result.toString()).toEqual('<p></p><h3></h3>')
		})

		it('hillcrestpartyrentals.html  should return Object with valid: true.  not closing <p> tag on line 476', () => {
			const result = parse(fs.readFileSync(__dirname + '/html/hillcrestpartyrentals.html').toString());
			expect(result.valid).toEqual(true);
		})

		it('google.html  should return Object with valid: true', () => {
			const result = parse(fs.readFileSync(__dirname + '/html/google.html').toString());
			expect(result.valid).toEqual(true);
		})

		it('gmail.html  should return Object with valid: true', () => {
			const result = parse(fs.readFileSync(__dirname + '/html/gmail.html').toString());
			expect(result.valid).toEqual(true);
		})

		it('ffmpeg.html  should return Object with valid: true (extra opening <div>', () => {
			const result = parse(fs.readFileSync(__dirname + '/html/ffmpeg.html').toString());
			expect(result.valid).toEqual(true);
		})

		// fix issue speed test

		it('should fix "<div><h3><h3><div>" to "<div><h3></h3></div>"', () => {
			const result = parse('<div data-id=1><h3 data-id=2><h3><div>');
			expect(result.valid).toEqual(false);
			expect(result.toString()).toEqual('<div data-id=1><h3 data-id=2></h3></div>');
		})

		it('should fix "<div><h3><h3><span><span><div>" to "<div><h3></h3><span></span></div>"', () => {
			const result = parse('<div><h3><h3><span><span><div>');
			expect(result.valid).toEqual(false);
			expect(result.toString()).toEqual('<div><h3></h3><span></span></div>');
		})

		it('gmail.html  should return Object with valid: true', () => {
			const result = parse(fs.readFileSync(__dirname + '/html/gmail.html').toString().replace(/<\//gi, '<'));
			expect(result.valid).toEqual(false);
		})

		it('gmail.html  should return Object with valid: true', () => {
			const result = parse(fs.readFileSync(__dirname + '/html/nice.html').toString().replace(/<\//gi, '<'));
			expect(result.valid).toEqual(false);
		})

	});

	describe('TextNode', () => {
		describe('#isWhitespace', () => {
			it('should detect whitespace correctly', () => {
				let node = new TextNode('');
				expect(node.isWhitespace).toBeTruthy();
				node = new TextNode(' \t');
				expect(node.isWhitespace).toBeTruthy();
				node = new TextNode(' \t&nbsp; \t');
				expect(node.isWhitespace).toBeTruthy();
			});
		});
	});

	describe('HTMLElement', () => {

		describe('#prependChild()', () => {
			it('should add children in the correct order', () => {
				const root = parse('<p></p>');

				const p = root.firstChild as HTMLElement;
				p.prependChild(new TextNode('3'));
				p.prependChild(new TextNode('2'));
				p.prependChild(new TextNode('1'));

				expect(root.firstChild.text).toEqual('123');
			});
		});

		describe('#remove()', () => {
			it('should remove the current node', () => {
				const root = parse('<div><p></p></div>');
				const child = root.firstChild as HTMLElement
				child.firstChild.remove()
				expect(child.outerHTML).toEqual('<div></div>');
			});
		});

		describe('#removeWhitespace()', () => {
			it('should remove whitespaces while preserving nodes with content', () => {
				const root = parse('<div> \r \n  \t <h5> 123 </h5></div>');

				const p = new HTMLElement('div');
				p.appendChild(new HTMLElement('h5'))
					.appendChild(new TextNode('123'));

				const child = root.firstChild as HTMLElement
				child.parentNode = null
				expect(child.removeWhitespace()).toEqual(p);
			});
		});

		describe('#rawAttributes', () => {
			it('should return escaped attributes of the element', () => {
				const root = parse('<p a=12 data-id="!$$&amp;" yAz=\'1\'></p>');
				const child = root.firstChild as HTMLElement
				expect(child.rawAttributes).toEqual({
					'a': '12',
					'data-id': '!$$&amp;',
					'yAz': '1'
				});
			});
		});

		describe('#attributes', () => {
			it('should return attributes of the element', () => {
				const root = parse('<p a=12 data-id="!$$&amp;" yAz=\'1\' class="" disabled></p>');
				const child = root.firstChild as HTMLElement
				expect(child.attributes).toEqual({
					'a': '12',
					'data-id': '!$$&',
					'yAz': '1',
					'disabled': '',
					'class': ''
				});
			});
		});

		describe('#setAttribute', () => {
			it('should edit the attributes of the element', () => {
				const root = parse('<p a=12></p>');
				const child = root.firstChild as HTMLElement
				child.setAttribute('a', 13 as unknown as string);
				expect(child.attributes).toEqual({
					'a': '13',
				});
				expect(child.toString()).toEqual('<p a="13"></p>');
			});
			it('should add an attribute to the element', () => {
				const root = parse('<p a=12></p>');
				const child = root.firstChild as HTMLElement
				child.setAttribute('b', 13 as unknown as string);
				expect(child.attributes).toEqual({
					'a': '12',
					'b': '13',
				});
				expect(child.toString()).toEqual('<p a="12" b="13"></p>');
				child.setAttribute('required', '');
				expect(child.toString()).toEqual('<p a="12" b="13" required></p>');
			});
			it('should add an attribute with a new line to the element', () => {
				const root = parse('<p></p>');
				const child = root.firstChild as HTMLElement
				child.setAttribute('b', "test\ntest");
				expect((parse(root.innerHTML).firstChild as HTMLElement).attributes).toEqual({
					'b': 'test\ntest',
				});
			});
			it('should remove an attribute from the element', () => {
				const root = parse('<p a=12 b=13 c=14 data-id="!$$&amp;"></p>');
				const child = root.firstChild as HTMLElement
				child.setAttribute('b', undefined);
				// @ts-ignore
				child.setAttribute('c');
				expect(child.attributes).toEqual({
					'a': '12',
					'data-id': "!$$&"
				});
				expect(child.toString()).toEqual('<p a="12" data-id="!$$&amp;"></p>');
			});
		});

		describe('#setAttributes', () => {
			it('should replace all attributes of the element', () => {
				const root = parse('<p a=12 data-id="!$$&amp;" yAz=\'1\' class="" disabled></p>');
				const child = root.firstChild as HTMLElement
				child.setAttributes({ c: 12 as unknown as string });
				expect(child.attributes).toEqual({
					'c': '12',
				});
				expect(child.toString()).toEqual('<p c="12"></p>');
			});
		});

		describe('#querySelector()', () => {
			it('should return correct elements in DOM tree', () => {
				const root = parse('<a id="id" data-id="myid"><div><span class="a b"></span><span></span><span></span></div></a>');
				const childA = root.firstChild as HTMLElement
				const childSpan = childA.firstChild as HTMLElement
				expect(root.querySelector('#id')).toEqual(childA);
				expect(root.querySelector('span.a')).toEqual(childSpan.firstChild);
				expect(root.querySelector('span.b')).toEqual(childSpan.firstChild);
				expect(root.querySelector('span.a.b')).toEqual(childSpan.firstChild);
				expect(root.querySelector('#id .b')).toEqual(childSpan.firstChild);
				expect(root.querySelector('#id span')).toEqual(childSpan.firstChild);
				expect(root.querySelector('[data-id=myid]')).toEqual(childA);
				expect(root.querySelector('[data-id="myid"]')).toEqual(childA);
			});
		});

		describe('#querySelectorAll()', () => {
			it('should return correct elements in DOM tree', () => {
				const root = parse('<a id="id"><div><span id="3" class="a b"></span><span></span><span></span></div></a>');
				const child = root.firstChild as HTMLElement
				const grandChild = child.firstChild as HTMLElement
				expect(root.querySelectorAll('#id')).toEqual([child]);
				expect(root.querySelectorAll('span.a')).toEqual([grandChild.firstChild]);
				expect(root.querySelectorAll('span.b')).toEqual([grandChild.firstChild]);
				expect(root.querySelectorAll('span.a.b')).toEqual([grandChild.firstChild]);
				expect(root.querySelectorAll('#id .b')).toEqual([grandChild.firstChild]);
				expect(root.querySelectorAll('#id span')).toEqual(grandChild.childNodes);
				expect(root.querySelectorAll('#id, #id .b')).toEqual([child, grandChild.firstChild]);
			});
			it('should return just one element', () => {
				const root = parse('<time class="date">');
				expect(root.querySelectorAll('time,.date')).toEqual([root.firstChild]);
			});
			it('should return all elements', () => {
				const root = parse(`<div><div></div></div>`)				
				expect(root.querySelectorAll('div').length).toEqual(2)
			});
			it('should return elements in correct order', () => {
				const root = parse(`<div id="1"><div id="2"></div><div id="3"></div></div>`)
				expect(root.querySelectorAll('div').map(div => div.id).join(',')).toEqual('1,2,3')
			});
		});

		describe('#structuredText', () => {
			it('should return correct structured text', () => {
				const root = parse('<span>o<p>a</p><p>b</p>c</span>');
				expect(root.structuredText).toEqual('o\na\nb\nc');
			});

			it('should not return comments in structured text', () => {
				const root = parse('<span>o<p>a</p><!-- my comment --></span>', { comment: true });
				expect(root.structuredText).toEqual('o\na');
			});
		});
		describe('#set_content', () => {
			it('set content string', () => {
				const root = parse('<div></div>');
				root.children[0]!.set_content('<span><div>abc</div>bla</span>');
				expect(root.toString()).toEqual('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content nodes', () => {
				const root = parse('<div></div>');
				root.children[0]!.set_content(parse('<span><div>abc</div>bla</span>').childNodes);
				expect(root.toString()).toEqual('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content node', () => {
				const root = parse('<div></div>');
				root.children[0]!.set_content(parse('<span><div>abc</div>bla</span>').childNodes[0]!);
				expect(root.toString()).toEqual('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content text', () => {
				const root = parse('<div></div>');
				root.children[0]!.set_content('abc');
				expect(root.toString()).toEqual('<div>abc</div>');
			});
		});
		describe('#set innerHTML', () => {
			it('set content string', () => {
				const root = parse('<div></div>');
				root.children[0]!.innerHTML='<span><div>abc</div>bla</span>';
				expect(root.toString()).toEqual('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content nodes', () => {
				const root = parse('<div></div>');
				root.children[0]!.innerHTML='<span><div>abc</div>bla</span>';
				expect(root.toString()).toEqual('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content node', () => {
				const root = parse('<div></div>');
				root.children[0]!.innerHTML='<span><div>abc</div>bla</span>';
				expect(root.toString()).toEqual('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content text', () => {
				const root = parse('<div></div>');
				root.children[0]!.innerHTML='abc';
				expect(root.toString()).toEqual('<div>abc</div>');
			});
		});
	});

	describe('stringify', () => {
		it('#toString()', () => {
			const html = '<p id="id" data-feidao-actions="ssss"><a class=\'cls\'>Hello</a><ul><li>aaaaa</li></ul><span>bbb</span></p>';
			const root = parse(html);
			expect(root.toString()).toEqual(html)
		});

		it('#toString() should not return comments by default', () => {
			const html = '<p><!-- my comment --></p>';
			const result = '<p></p>';
			const root = parse(html);
			expect(root.toString()).toEqual(result);
		});

		it('#toString() should return comments when specified', () => {
			const html = '<!----><p><!-- my comment --></p>';
			const root = parse(html, { comment: true });
			expect(root.toString()).toEqual(html);
		});

		it('#toString() should return encoded html entities', () => {
			const html = '<p>&lt;</p>';
			const root = parse(html);
			expect(root.toString()).toEqual(html);
		});
	});

	describe('Comment Element', () => {
		it('comment nodeType should be 8', () => {
			const root = parse('<!-- my comment -->', { comment: true });
			expect(root.firstChild.nodeType).toEqual(8);
		});
	});

	describe('Custom Element', () => {
		it('parse "<my-widget></my-widget>" tagName should be "my-widget"', () => {

			const root = parse('<my-widget></my-widget>');
			const child = root.firstChild as HTMLElement
			expect(child.tagName).toEqual('my-widget');
		});
	});

	describe('Custom Element multiple dash', () => {
		it('parse "<my-new-widget></my-new-widget>" tagName should be "my-new-widget"', () => {

			const root = parse('<my-new-widget></my-new-widget>');
			const child = root.firstChild as HTMLElement
			expect(child.tagName).toEqual('my-new-widget');
		});
	});

	describe('Font family', () => {
		it('parse font-family style attribute', () => {

			const root = parse(`<div style='font-family: "Nunito", "Arial", sans-serif'></div>`);
			const child = root.firstChild as HTMLElement
			expect(child.attributes.style).toEqual('font-family: "Nunito", "Arial", sans-serif');
		});
	});

	describe('Background Image', () => {
		it('parse background image', () => {
			const root = parse(`<div class="a" style="background-image:url('test.jpg')"></div>`);
			const child = root.querySelector('.a') as HTMLElement
			expect(child.attributes.style).toEqual(`background-image:url('test.jpg')`);
		});
	});
});