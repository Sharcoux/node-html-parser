import fs from 'fs'
import { Matcher, HTMLElement, TextNode, CommentNode, parse } from '../src'
// @ts-ignore
import should from 'should'

describe('HTML Parser', function () {

	describe('Matcher', function () {
		it('should match corrent elements', function () {
			const matcher = new Matcher('#id .a a.b *.a.b .a.b * a');
			const MatchesNothingButStarEl = new HTMLElement('_');
			const withIdEl = new HTMLElement('p', "id='id'");
			const withClassNameEl = new HTMLElement('a', "class='a b'");

			matcher.advance(MatchesNothingButStarEl).should.not.be.ok; // #id
			matcher.advance(withClassNameEl).should.not.be.ok; // #id
			matcher.advance(withIdEl).should.be.ok; // #id

			matcher.advance(MatchesNothingButStarEl).should.not.be.ok; // .a
			matcher.advance(withIdEl).should.not.be.ok; // .a
			matcher.advance(withClassNameEl).should.be.ok; // .a

			matcher.advance(MatchesNothingButStarEl).should.not.be.ok; // a.b
			matcher.advance(withIdEl).should.not.be.ok; // a.b
			matcher.advance(withClassNameEl).should.be.ok; // a.b

			matcher.advance(withIdEl).should.not.be.ok; // *.a.b
			matcher.advance(MatchesNothingButStarEl).should.not.be.ok; // *.a.b
			matcher.advance(withClassNameEl).should.be.ok; // *.a.b

			matcher.advance(withIdEl).should.not.be.ok; // .a.b
			matcher.advance(MatchesNothingButStarEl).should.not.be.ok; // .a.b
			matcher.advance(withClassNameEl).should.be.ok; // .a.b

			matcher.advance(withIdEl).should.be.ok; // *
			matcher.rewind();
			matcher.advance(MatchesNothingButStarEl).should.be.ok; // *
			matcher.rewind();
			matcher.advance(withClassNameEl).should.be.ok; // *

			matcher.advance(withIdEl).should.not.be.ok; // a
			matcher.advance(MatchesNothingButStarEl).should.not.be.ok; // a
			matcher.advance(withClassNameEl).should.be.ok; // a

			matcher.matched.should.be.ok;
		});
	});

	describe('parse()', function () {
		it('should parse "<p id=\\"id\\"><a class=\'cls\'>Hello</a><ul><li><li></ul><span></span></p>" and return root element', function () {

			const root = parse('<p id="id"><a class=\'cls\'>Hello</a><ul><li><li></ul><span></span></p>');

			const p = new HTMLElement('p', 'id="id"');
			p.appendChild(new HTMLElement('a', 'class=\'cls\''))
				.appendChild(new TextNode('Hello'));
			const ul = p.appendChild(new HTMLElement('ul'));
			ul.appendChild(new HTMLElement('li'));
			ul.appendChild(new HTMLElement('li'));
			p.appendChild(new HTMLElement('span'));

			root.firstChild.parentNode = null
			root.firstChild.should.eql(p);
		});

		it('should parse "<DIV><a><img/></A><p></P></div>" and return root element', function () {

			const root = parse('<DIV><a><img/></A><p></P></div>', {
				lowerCaseTagName: true
			});

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));
			a.appendChild(new HTMLElement('img'));
			div.appendChild(new HTMLElement('p'));

			root.firstChild.parentNode = null
			root.firstChild.should.eql(div);

		});

		it('should parse "<div><a><img/></a><p></p></div>" and return root element', function () {

			const root = parse('<div><a><img/></a><p></p></div>');

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));
			a.appendChild(new HTMLElement('img'));
			div.appendChild(new HTMLElement('p'));

			root.firstChild.parentNode = null
			root.firstChild.should.eql(div);

		});

		it('should parse "<tr><th></th></tr>" and return root element', function () {
			const a = `<tr><th></th></tr>`
			const root = parse(a);
			root.firstChild.toString().should.eql(a);
		});

		it('should parse text node and return root element', function () {
			const root = parse('this is text<br />');
			root.outerHTML.should.eql('this is text<br />');
		});

		it('should parse text with 2 br tags and return root element', function () {
			const root = parse('this is text<br /> with 2<br />');
			root.outerHTML.should.eql('this is text<br /> with 2<br />');
		});

		it('should parse text nodes and return a root element containing the text node as only child', function () {
			const root = parse('text node');

			const textNode = new TextNode('text node')

			root.firstChild.should.eql(textNode)
		})

		it('should parse "<div><a><!-- my comment --></a></div>" and return root element without comments', function () {
			const root = parse('<div><a><!-- my comment --></a></div>');

			const div = new HTMLElement('div');
			div.appendChild(new HTMLElement('a'));

			root.firstChild.parentNode = null
			root.firstChild.should.eql(div);
		});

		it('should parse "<div><a><!-- my comment --></a></div>" and return root element with comments', function () {
			const root = parse('<div><a><!-- my comment --></a></div>', { comment: true });

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));
			a.appendChild(new CommentNode(' my comment '));

			root.firstChild.parentNode = null
			root.firstChild.should.eql(div);
		});

		it('should not parse HTML inside comments', function () {
			const root = parse('<div><!--<a></a>--></div>', { comment: true });

			const div = new HTMLElement('div');
			div.appendChild(new CommentNode('<a></a>'));

			root.firstChild.parentNode = null
			root.firstChild.should.eql(div);
		});

		it('should set the parent when adding nodes', function () {
			const root = parse('<div>a</div><div>b</div>', { comment: true });
			root.firstChild.parentNode.should.eql(root);
		});

		it('should parse picture element', function () {

			const root = parse('<picture><source srcset="/images/example-1.jpg 1200w, /images/example-2.jpg 1600w" sizes="100vw"><img src="/images/example.jpg" alt="Example"/></picture>');

			const picture = new HTMLElement('picture');
			picture.appendChild(new HTMLElement('source', 'srcset="/images/example-1.jpg 1200w, /images/example-2.jpg 1600w" sizes="100vw"'));
			picture.appendChild(new HTMLElement('img', 'src="/images/example.jpg" alt="Example"'));

			root.firstChild.parentNode = null
			root.firstChild.should.eql(picture);
		});

		it('should not extract text in script and style by default', function () {

			const root = parse('<script>1</script><style>2</style>');

			root.firstChild.childNodes.should.be.empty;
			root.lastChild.childNodes.should.be.empty;

		});

		it('should extract text in script and style when ask so', function () {

			const root = parse('<script>1</script><style>2&amp;</style>', {
				script: true,
				style: true
			});

			root.firstChild.childNodes.should.not.be.empty;
			root.firstChild.childNodes.should.eql([new TextNode('1')]);
			root.firstChild.text.should.eql('1');
			root.lastChild.childNodes.should.not.be.empty;
			root.lastChild.childNodes.should.eql([new TextNode('2&amp;')]);
			root.lastChild.text.should.eql('2&');
			root.lastChild.rawText.should.eql('2&amp;');
		});

		it('should be able to parse "html/incomplete-script" file', function () {

			parse(fs.readFileSync(__dirname + '/html/incomplete-script').toString(), {
				script: true
			});

		});

		it('should be able to parse namespaces', function () {
			const namespacedXML = '<ns:identifier>content</ns:identifier>';
			parse(namespacedXML).toString().should.eql(namespacedXML);
		});

		it('should parse "<div><a><img/></a><p></p></div>.." very fast', function () {

			for (let i = 0; i < 100; i++)
				parse('<div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div>');

		});

		it('should parse "<DIV><a><img/></A><p></P></div>.." fast', function () {

			for (let i = 0; i < 100; i++)
				parse('<DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div>', {
					lowerCaseTagName: true
				});

		});

		// Should parse self closing tags.

		it('should parse self closing tag', function () {
			parse("<img src=\"test.jpg\">").toString().should.eql("<img src=\"test.jpg\" />");
			parse("<meta charset=\"utf-8\" \>").toString().should.eql("<meta charset=\"utf-8\" />");
		});

		// Test for broken tags. <h3>something<h3>

		it('should parse "<div><h3>content<h3> <span> other <span></div>" (fix h3, span closing tag) very fast', function () {
			parse(fs.readFileSync(__dirname + '/html/incomplete-script').toString());
		});

		// Test for values of attributes that include >

		it('should parse "<div attr=">"></div>"', function () {
			const root = parse("<div attr='>'></div>")
			const child = root.firstChild as HTMLElement
			child.tagName.should.eql("div")
			child.attributes.attr.should.eql(">")
		})

	});

	describe('parseWithValidation', function () {
		// parse with validation tests

		it('should return Object with valid: true.  does not count <p><p></p> as error. instead fixes it to <p></p><p></p>', function () {
			const result = parse('<p><p></p>');
			result.valid.should.eql(true);
		})

		it('should return Object with valid: true.  does not count <p><p/></p> as error. instead fixes it to <p><p></p></p>', function () {
			const result = parse('<p><p/></p>');
			result.valid.should.eql(true);
		})

		it('should return Object with valid: false.  does not count <p><h3></p> as error', function () {
			const result = parse('<p><h3></p>');
			result.valid.should.eql(false);
		})

		it('hillcrestpartyrentals.html  should return Object with valid: false.  not closing <p> tag on line 476', function () {
			const result = parse(fs.readFileSync(__dirname + '/html/hillcrestpartyrentals.html').toString());
			result.valid.should.eql(false);
		})

		it('google.html  should return Object with valid: true', function () {
			const result = parse(fs.readFileSync(__dirname + '/html/google.html').toString());
			result.valid.should.eql(true);
		})

		it('gmail.html  should return Object with valid: true', function () {
			const result = parse(fs.readFileSync(__dirname + '/html/gmail.html').toString());
			result.valid.should.eql(true);
		})

		it('ffmpeg.html  should return Object with valid: false (extra opening <div>', function () {
			const result = parse(fs.readFileSync(__dirname + '/html/ffmpeg.html').toString());
			result.valid.should.eql(false);
		})

		// fix issue speed test

		it('should fix "<div><h3><h3><div>" to "<div><h3></h3></div>"', function () {
			const result = parse('<div data-id=1><h3 data-id=2><h3><div>');
			result.valid.should.eql(false);
			result.toString().should.eql('<div data-id=1><h3 data-id=2></h3></div>');
		})

		it('should fix "<div><h3><h3><span><span><div>" to "<div><h3></h3><span></span></div>"', function () {
			const result = parse('<div><h3><h3><span><span><div>');
			result.valid.should.eql(false);
			result.toString().should.eql('<div><h3></h3><span></span></div>');
		})

		it('gmail.html  should return Object with valid: true', function () {
			const result = parse(fs.readFileSync(__dirname + '/html/gmail.html').toString().replace(/<\//gi, '<'));
			result.valid.should.eql(false);
		})

		it('gmail.html  should return Object with valid: true', function () {
			const result = parse(fs.readFileSync(__dirname + '/html/nice.html').toString().replace(/<\//gi, '<'));
			result.valid.should.eql(false);
		})

	});

	describe('TextNode', function () {
		describe('#isWhitespace', function () {
			let node = new TextNode('');
			node.isWhitespace.should.be.ok;
			node = new TextNode(' \t');
			node.isWhitespace.should.be.ok;
			node = new TextNode(' \t&nbsp; \t');
			node.isWhitespace.should.be.ok;
		});
	});

	describe('HTMLElement', function () {

		describe('#prependChild()', function () {
			it('should add children in the correct order', function () {
				const root = parse('<p></p>');

				const p = root.firstChild as HTMLElement;
				p.prependChild(new TextNode('3'));
				p.prependChild(new TextNode('2'));
				p.prependChild(new TextNode('1'));

				root.firstChild.text.should.eql('123');
			});
		});

		describe('#remove()', function () {
			it('should remove the current node', function () {
				const root = parse('<div><p></p></div>');
				const child = root.firstChild as HTMLElement
				child.firstChild.remove()
				child.outerHTML.should.eql('<div></div>');
			});
		});

		describe('#removeWhitespace()', function () {
			it('should remove whitespaces while preserving nodes with content', function () {
				const root = parse('<p> \r \n  \t <h5> 123 </h5></p>');

				const p = new HTMLElement('p');
				p.appendChild(new HTMLElement('h5'))
					.appendChild(new TextNode('123'));

				const child = root.firstChild as HTMLElement
				child.parentNode = null
				child.removeWhitespace().should.eql(p);
			});
		});

		describe('#rawAttributes', function () {
			it('should return escaped attributes of the element', function () {
				const root = parse('<p a=12 data-id="!$$&amp;" yAz=\'1\'></p>');
				const child = root.firstChild as HTMLElement
				child.rawAttributes.should.eql({
					'a': '12',
					'data-id': '!$$&amp;',
					'yAz': '1'
				});
			});
		});

		describe('#attributes', function () {
			it('should return attributes of the element', function () {
				const root = parse('<p a=12 data-id="!$$&amp;" yAz=\'1\' class="" disabled></p>');
				const child = root.firstChild as HTMLElement
				child.attributes.should.eql({
					'a': '12',
					'data-id': '!$$&',
					'yAz': '1',
					'disabled': '',
					'class': ''
				});
			});
		});

		describe('#setAttribute', function () {
			it('should edit the attributes of the element', function () {
				const root = parse('<p a=12></p>');
				const child = root.firstChild as HTMLElement
				child.setAttribute('a', 13 as unknown as string);
				child.attributes.should.eql({
					'a': '13',
				});
				child.toString().should.eql('<p a="13"></p>');
			});
			it('should add an attribute to the element', function () {
				const root = parse('<p a=12></p>');
				const child = root.firstChild as HTMLElement
				child.setAttribute('b', 13 as unknown as string);
				child.attributes.should.eql({
					'a': '12',
					'b': '13',
				});
				child.toString().should.eql('<p a="12" b="13"></p>');
				child.setAttribute('required', '');
				child.toString().should.eql('<p a="12" b="13" required></p>');
			});
			it('should add an attribute with a new line to the element', function () {
				const root = parse('<p></p>');
				const child = root.firstChild as HTMLElement
				child.setAttribute('b', "test\ntest");
				(parse(root.innerHTML).firstChild as HTMLElement).attributes.should.eql({
					'b': 'test\ntest',
				});
			});
			it('should remove an attribute from the element', function () {
				const root = parse('<p a=12 b=13 c=14 data-id="!$$&amp;"></p>');
				const child = root.firstChild as HTMLElement
				child.setAttribute('b', undefined);
				// @ts-ignore
				child.setAttribute('c');
				child.attributes.should.eql({
					'a': '12',
					'data-id': "!$$&"
				});
				child.toString().should.eql('<p a="12" data-id="!$$&amp;"></p>');
			});
		});

		describe('#setAttributes', function () {
			it('should replace all attributes of the element', function () {
				const root = parse('<p a=12 data-id="!$$&amp;" yAz=\'1\' class="" disabled></p>');
				const child = root.firstChild as HTMLElement
				child.setAttributes({ c: 12 as unknown as string });
				child.attributes.should.eql({
					'c': '12',
				});
				child.toString().should.eql('<p c="12"></p>');
			});
		});

		describe('#querySelector()', function () {
			it('should return correct elements in DOM tree', function () {
				const root = parse('<a id="id" data-id="myid"><div><span class="a b"></span><span></span><span></span></div></a>');
				const child = root.firstChild as HTMLElement
				const grandChild = child.firstChild as HTMLElement
				root.querySelector('#id').should.eql(child);
				root.querySelector('span.a').should.eql(grandChild.firstChild);
				root.querySelector('span.b').should.eql(grandChild.firstChild);
				root.querySelector('span.a.b').should.eql(grandChild.firstChild);
				root.querySelector('#id .b').should.eql(grandChild.firstChild);
				root.querySelector('#id span').should.eql(grandChild.firstChild);
				root.querySelector('[data-id=myid]').should.eql(child);
				root.querySelector('[data-id="myid"]').should.eql(child);
			});
		});

		describe('#querySelectorAll()', function () {
			it('should return correct elements in DOM tree', function () {
				const root = parse('<a id="id"><div><span id="3" class="a b"></span><span></span><span></span></div></a>');
				const child = root.firstChild as HTMLElement
				const grandChild = child.firstChild as HTMLElement
				root.querySelectorAll('#id').should.eql([child]);
				root.querySelectorAll('span.a').should.eql([grandChild.firstChild]);
				root.querySelectorAll('span.b').should.eql([grandChild.firstChild]);
				root.querySelectorAll('span.a.b').should.eql([grandChild.firstChild]);
				root.querySelectorAll('#id .b').should.eql([grandChild.firstChild]);
				root.querySelectorAll('#id span').should.eql(grandChild.childNodes);
				root.querySelectorAll('#id, #id .b').should.eql([child, grandChild.firstChild]);
			});
			it('should return just one element', function () {
				const root = parse('<time class="date">');
				root.querySelectorAll('time,.date').should.eql([root.firstChild]);
			});
			it('should return all elements', function () {
				const root = parse(`<div><div></div></div>`)				
				root.querySelectorAll('div').length.should.eql(2)
			});
			it('should return elements in correct order', function () {
				const root = parse(`<div id="1"><div id="2"></div><div id="3"></div></div>`)
				root.querySelectorAll('div').map(div => div.id).join(',').should.eql('1,2,3')
			});
		});

		describe('#structuredText', function () {
			it('should return correct structured text', function () {
				const root = parse('<span>o<p>a</p><p>b</p>c</span>');
				root.structuredText.should.eql('o\na\nb\nc');
			});

			it('should not return comments in structured text', function () {
				const root = parse('<span>o<p>a</p><!-- my comment --></span>', { comment: true });
				root.structuredText.should.eql('o\na');
			});
		});
		describe('#set_content', function () {
			it('set content string', function () {
				const root = parse('<div></div>');
				root.children[0].set_content('<span><div>abc</div>bla</span>');
				root.toString().should.eql('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content nodes', function () {
				const root = parse('<div></div>');
				root.children[0].set_content(parse('<span><div>abc</div>bla</span>').childNodes);
				root.toString().should.eql('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content node', function () {
				const root = parse('<div></div>');
				root.children[0].set_content(parse('<span><div>abc</div>bla</span>').childNodes[0]);
				root.toString().should.eql('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content text', function () {
				const root = parse('<div></div>');
				root.children[0].set_content('abc');
				root.toString().should.eql('<div>abc</div>');
			});
		});
		describe('#set innerHTML', function () {
			it('set content string', function () {
				const root = parse('<div></div>');
				root.children[0].innerHTML='<span><div>abc</div>bla</span>';
				root.toString().should.eql('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content nodes', function () {
				const root = parse('<div></div>');
				root.children[0].innerHTML='<span><div>abc</div>bla</span>';
				root.toString().should.eql('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content node', function () {
				const root = parse('<div></div>');
				root.children[0].innerHTML='<span><div>abc</div>bla</span>';
				root.toString().should.eql('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content text', function () {
				const root = parse('<div></div>');
				root.children[0].innerHTML='abc';
				root.toString().should.eql('<div>abc</div>');
			});
		});
	});

	describe('stringify', function () {
		it('#toString()', function () {
			const html = '<p id="id" data-feidao-actions="ssss"><a class=\'cls\'>Hello</a><ul><li>aaaaa</li></ul><span>bbb</span></p>';
			const root = parse(html);
			root.toString().should.eql(html)
		});

		it('#toString() should not return comments by default', function () {
			const html = '<p><!-- my comment --></p>';
			const result = '<p></p>';
			const root = parse(html);
			root.toString().should.eql(result);
		});

		it('#toString() should return comments when specified', function () {
			const html = '<!----><p><!-- my comment --></p>';
			const root = parse(html, { comment: true });
			root.toString().should.eql(html);
		});

		it('#toString() should return encoded html entities', function () {
			const html = '<p>&lt;</p>';
			const root = parse(html);
			root.toString().should.eql(html);
		});
	});

	describe('Comment Element', function () {
		it('comment nodeType should be 8', function () {
			const root = parse('<!-- my comment -->', { comment: true });
			root.firstChild.nodeType.should.eql(8);
		});
	});

	describe('Custom Element', function () {
		it('parse "<my-widget></my-widget>" tagName should be "my-widget"', function () {

			const root = parse('<my-widget></my-widget>');
			const child = root.firstChild as HTMLElement
			child.tagName.should.eql('my-widget');
		});
	});

	describe('Custom Element multiple dash', function () {
		it('parse "<my-new-widget></my-new-widget>" tagName should be "my-new-widget"', function () {

			const root = parse('<my-new-widget></my-new-widget>');
			const child = root.firstChild as HTMLElement
			child.tagName.should.eql('my-new-widget');
		});
	});

	describe('Font family', function () {
		it('parse font-family style attribute', function () {

			const root = parse(`<div style='font-family: "Nunito", "Arial", sans-serif'></div>`);
			const child = root.firstChild as HTMLElement
			child.attributes.style.should.eql('font-family: "Nunito", "Arial", sans-serif');
		});
	});
});
