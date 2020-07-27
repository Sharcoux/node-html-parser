const should = require('should');
const fs = require('fs');
const util = require('util');

const HTMLParser = require('../dist');

describe('HTML Parser', function () {

	const Matcher = HTMLParser.Matcher;
	const HTMLElement = HTMLParser.HTMLElement;
	const TextNode = HTMLParser.TextNode;
	const CommentNode = HTMLParser.CommentNode;

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

	const parseHTML = HTMLParser.parse;

	describe('parse()', function () {
		it('should parse "<p id=\\"id\\"><a class=\'cls\'>Hello</a><ul><li><li></ul><span></span></p>" and return root element', function () {

			const root = parseHTML('<p id="id"><a class=\'cls\'>Hello</a><ul><li><li></ul><span></span></p>');

			const p = new HTMLElement('p', 'id="id"');
			p.appendChild(new HTMLElement('a', 'class=\'cls\''))
				.appendChild(new TextNode('Hello'));
			const ul = p.appendChild(new HTMLElement('ul'));
			ul.appendChild(new HTMLElement('li'));
			ul.appendChild(new HTMLElement('li'));
			p.appendChild(new HTMLElement('span'));

			root.firstChild.should.eql(p);
		});

		it('should parse "<DIV><a><img/></A><p></P></div>" and return root element', function () {

			const root = parseHTML('<DIV><a><img/></A><p></P></div>', {
				lowerCaseTagName: true
			});

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));
			const img = a.appendChild(new HTMLElement('img'));
			const p = div.appendChild(new HTMLElement('p'));

			root.firstChild.should.eql(div);

		});

		it('should parse "<div><a><img/></a><p></p></div>" and return root element', function () {

			const root = parseHTML('<div><a><img/></a><p></p></div>');

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));
			const img = a.appendChild(new HTMLElement('img'));
			const p = div.appendChild(new HTMLElement('p'));

			root.firstChild.should.eql(div);

		});

		it('should parse text nodes and return a root element containing the text node as only child', function () {
			const root = parseHTML('text node');

			const textNode = new TextNode('text node')

			root.firstChild.should.eql(textNode)
		})

		it('should parse "<div><a><!-- my comment --></a></div>" and return root element without comments', function () {
			const root = parseHTML('<div><a><!-- my comment --></a></div>');

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));

			root.firstChild.should.eql(div);
		});

		it('should parse "<div><a><!-- my comment --></a></div>" and return root element with comments', function () {
			const root = parseHTML('<div><a><!-- my comment --></a></div>', { comment: true });

			const div = new HTMLElement('div');
			const a = div.appendChild(new HTMLElement('a'));
			const comment = a.appendChild(new CommentNode(' my comment '));

			root.firstChild.should.eql(div);
		});

		it('should not parse HTML inside comments', function () {
			const root = parseHTML('<div><!--<a></a>--></div>', { comment: true });

			const div = new HTMLElement('div');
			const comment = div.appendChild(new CommentNode('<a></a>'));

			root.firstChild.should.eql(div);
		});

		it('should parse picture element', function () {

			const root = parseHTML('<picture><source srcset="/images/example-1.jpg 1200w, /images/example-2.jpg 1600w" sizes="100vw"><img src="/images/example.jpg" alt="Example"/></picture>');

			const picture = new HTMLElement('picture');
			const source = picture.appendChild(new HTMLElement('source', 'srcset="/images/example-1.jpg 1200w, /images/example-2.jpg 1600w" sizes="100vw"'));
			const img = picture.appendChild(new HTMLElement('img', 'src="/images/example.jpg" alt="Example"'));

			root.firstChild.should.eql(picture);

		});

		it('should not extract text in script and style by default', function () {

			const root = parseHTML('<script>1</script><style>2</style>');

			root.firstChild.childNodes.should.be.empty;
			root.lastChild.childNodes.should.be.empty;

		});

		it('should extract text in script and style when ask so', function () {

			const root = parseHTML('<script>1</script><style>2&amp;</style>', {
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

			const root = parseHTML(fs.readFileSync(__dirname + '/html/incomplete-script').toString(), {
				script: true
			});

		});

		it('should be able to parse namespaces', function () {
			const namespacedXML = '<ns:identifier>content</ns:identifier>';
			parseHTML(namespacedXML).toString().should.eql(namespacedXML);
		});

		it('should parse "<div><a><img/></a><p></p></div>.." very fast', function () {

			for (let i = 0; i < 100; i++)
				parseHTML('<div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div><div><a><img/></a><p></p></div>');

		});

		it('should parse "<DIV><a><img/></A><p></P></div>.." fast', function () {

			for (let i = 0; i < 100; i++)
				parseHTML('<DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div><DIV><a><img/></A><p></P></div>', {
					lowerCaseTagName: true
				});

		});

		// Test for broken tags. <h3>something<h3>

		it('should parse "<div><h3>content<h3> <span> other <span></div>" (fix h3, span closing tag) very fast', function () {
			const root = parseHTML(fs.readFileSync(__dirname + '/html/incomplete-script').toString());
		});

		// Test for values of attributes that include >

		it('should parse "<div attr=">"></div>"', function () {
			const root = parseHTML("<div attr='>'></div>")
			root.firstChild.tagName.should.eql("div")
			root.firstChild.attributes.attr.should.eql(">")
		})

	});

	describe('parseWithValidation', function () {
		// parse with validation tests

		it('should return Object with valid: true.  does not count <p><p></p> as error. instead fixes it to <p></p><p></p>', function () {
			const result = parseHTML('<p><p></p>');
			result.valid.should.eql(true);
		})

		it('should return Object with valid: true.  does not count <p><p/></p> as error. instead fixes it to <p><p></p></p>', function () {
			const result = parseHTML('<p><p/></p>');
			result.valid.should.eql(true);
		})

		it('should return Object with valid: false.  does not count <p><h3></p> as error', function () {
			const result = parseHTML('<p><h3></p>');
			result.valid.should.eql(false);
		})

		it('hillcrestpartyrentals.html  should return Object with valid: false.  not closing <p> tag on line 476', function () {
			const result = parseHTML(fs.readFileSync(__dirname + '/html/hillcrestpartyrentals.html').toString(), {
				noFix: true
			});
			result.valid.should.eql(false);
		})

		it('google.html  should return Object with valid: true', function () {
			const result = parseHTML(fs.readFileSync(__dirname + '/html/google.html').toString(), {
				noFix: true
			});
			result.valid.should.eql(true);
		})

		it('gmail.html  should return Object with valid: true', function () {
			const result = parseHTML(fs.readFileSync(__dirname + '/html/gmail.html').toString(), {
				noFix: true
			});
			result.valid.should.eql(true);
		})

		it('ffmpeg.html  should return Object with valid: false (extra opening <div>', function () {
			const result = parseHTML(fs.readFileSync(__dirname + '/html/ffmpeg.html').toString(), {
				noFix: true
			});
			result.valid.should.eql(false);
		})

		// fix issue speed test

		it('should fix "<div><h3><h3><div>" to "<div><h3></h3></div>"', function () {
			const result = parseHTML('<div data-id=1><h3 data-id=2><h3><div>');
			result.valid.should.eql(false);
			result.toString().should.eql('<div data-id=1><h3 data-id=2></h3></div>');
		})

		it('should fix "<div><h3><h3><span><span><div>" to "<div><h3></h3><span></span></div>"', function () {
			const result = parseHTML('<div><h3><h3><span><span><div>');
			result.valid.should.eql(false);
			result.toString().should.eql('<div><h3></h3><span></span></div>');
		})

		it('gmail.html  should return Object with valid: true', function () {
			const result = parseHTML(fs.readFileSync(__dirname + '/html/gmail.html').toString().replace(/<\//gi, '<'));
			result.valid.should.eql(false);
		})

		it('gmail.html  should return Object with valid: true', function () {
			const result = parseHTML(fs.readFileSync(__dirname + '/html/nice.html').toString().replace(/<\//gi, '<'));
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

		describe('#removeWhitespace()', function () {
			it('should remove whitespaces while preserving nodes with content', function () {
				const root = parseHTML('<p> \r \n  \t <h5> 123 </h5></p>');

				const p = new HTMLElement('p');
				p.appendChild(new HTMLElement('h5'))
					.appendChild(new TextNode('123'));

				root.firstChild.removeWhitespace().should.eql(p);
			});
		});

		describe('#rawAttributes', function () {
			it('should return escaped attributes of the element', function () {
				const root = parseHTML('<p a=12 data-id="!$$&amp;" yAz=\'1\'></p>');
				root.firstChild.rawAttributes.should.eql({
					'a': '12',
					'data-id': '!$$&amp;',
					'yAz': '1'
				});
			});
		});

		describe('#attributes', function () {
			it('should return attributes of the element', function () {
				const root = parseHTML('<p a=12 data-id="!$$&amp;" yAz=\'1\' class="" disabled></p>');
				root.firstChild.attributes.should.eql({
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
				const root = parseHTML('<p a=12></p>');
				root.firstChild.setAttribute('a', 13);
				root.firstChild.attributes.should.eql({
					'a': '13',
				});
				root.firstChild.toString().should.eql('<p a="13"></p>');
			});
			it('should add an attribute to the element', function () {
				const root = parseHTML('<p a=12></p>');
				root.firstChild.setAttribute('b', 13);
				root.firstChild.attributes.should.eql({
					'a': '12',
					'b': '13',
				});
				root.firstChild.toString().should.eql('<p a="12" b="13"></p>');
				root.firstChild.setAttribute('required', '');
				root.firstChild.toString().should.eql('<p a="12" b="13" required></p>');
			});
			it('should remove an attribute from the element', function () {
				const root = parseHTML('<p a=12 b=13 c=14 data-id="!$$&amp;"></p>');
				root.firstChild.setAttribute('b', undefined);
				root.firstChild.setAttribute('c');
				root.firstChild.attributes.should.eql({
					'a': '12',
					'data-id': "!$$&"
				});
				root.firstChild.toString().should.eql('<p a="12" data-id="!$$&#x26;"></p>');
			});
		});

		describe('#setAttributes', function () {
			it('should replace all attributes of the element', function () {
				const root = parseHTML('<p a=12 data-id="!$$&amp;" yAz=\'1\' class="" disabled></p>');
				root.firstChild.setAttributes({c: 12});
				root.firstChild.attributes.should.eql({
					'c': '12',
				});
				root.firstChild.toString().should.eql('<p c="12"></p>');
			});
		});

		describe('#querySelector()', function () {
			it('should return correct elements in DOM tree', function () {
				const root = parseHTML('<a id="id" data-id="myid"><div><span class="a b"></span><span></span><span></span></div></a>');
				root.querySelector('#id').should.eql(root.firstChild);
				root.querySelector('span.a').should.eql(root.firstChild.firstChild.firstChild);
				root.querySelector('span.b').should.eql(root.firstChild.firstChild.firstChild);
				root.querySelector('span.a.b').should.eql(root.firstChild.firstChild.firstChild);
				root.querySelector('#id .b').should.eql(root.firstChild.firstChild.firstChild);
				root.querySelector('#id span').should.eql(root.firstChild.firstChild.firstChild);
				root.querySelector('[data-id=myid]').should.eql(root.firstChild);
				root.querySelector('[data-id="myid"]').should.eql(root.firstChild);
			});
		});

		describe('#querySelectorAll()', function () {
			it('should return correct elements in DOM tree', function () {
				const root = parseHTML('<a id="id"><div><span class="a b"></span><span></span><span></span></div></a>');
				root.querySelectorAll('#id').should.eql([root.firstChild]);
				root.querySelectorAll('span.a').should.eql([root.firstChild.firstChild.firstChild]);
				root.querySelectorAll('span.b').should.eql([root.firstChild.firstChild.firstChild]);
				root.querySelectorAll('span.a.b').should.eql([root.firstChild.firstChild.firstChild]);
				root.querySelectorAll('#id .b').should.eql([root.firstChild.firstChild.firstChild]);
				root.querySelectorAll('#id span').should.eql(root.firstChild.firstChild.childNodes);
				root.querySelectorAll('#id, #id .b').should.eql([root.firstChild, root.firstChild.firstChild.firstChild]);
			});
			it('should return just one element', function () {
				const root = parseHTML('<time class="date">');
				root.querySelectorAll('time,.date').should.eql([root.firstChild]);
			});
		});

		describe('#structuredText', function () {
			it('should return correct structured text', function () {
				const root = parseHTML('<span>o<p>a</p><p>b</p>c</span>');
				root.structuredText.should.eql('o\na\nb\nc');
			});

			it('should not return comments in structured text', function () {
				const root = parseHTML('<span>o<p>a</p><!-- my comment --></span>', { comment: true });
				root.structuredText.should.eql('o\na');
			});
		});
		describe('#set_content', function () {
			it('set content string', function () {
				const root = parseHTML('<div></div>');
				root.childNodes[0].set_content('<span><div>abc</div>bla</span>');
				root.toString().should.eql('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content nodes', function () {
				const root = parseHTML('<div></div>');
				root.childNodes[0].set_content(parseHTML('<span><div>abc</div>bla</span>').childNodes);
				root.toString().should.eql('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content node', function () {
				const root = parseHTML('<div></div>');
				root.childNodes[0].set_content(parseHTML('<span><div>abc</div>bla</span>').childNodes[0]);
				root.toString().should.eql('<div><span><div>abc</div>bla</span></div>');
			});
			it('set content text', function () {
				const root = parseHTML('<div></div>');
				root.childNodes[0].set_content('abc');
				root.toString().should.eql('<div>abc</div>');
			});
		});
	});

	describe('stringify', function () {
		it('#toString()', function () {
			const html = '<p id="id" data-feidao-actions="ssss"><a class=\'cls\'>Hello</a><ul><li>aaaaa</li></ul><span>bbb</span></p>';
			const root = parseHTML(html);
			root.toString().should.eql(html)
		});

		it('#toString() should not return comments by default', function () {
			const html = '<p><!-- my comment --></p>';
			const result = '<p></p>';
			const root = parseHTML(html);
			root.toString().should.eql(result);
		});

		it('#toString() should return comments when specified', function () {
			const html = '<!----><p><!-- my comment --></p>';
			const root = parseHTML(html, { comment: true });
			root.toString().should.eql(html);
		});
	});

	describe('Comment Element', function () {
		it('comment nodeType should be 8', function () {
			const root = parseHTML('<!-- my comment -->', { comment: true });
			root.firstChild.nodeType.should.eql(8);
		});
	});

	describe('Custom Element', function () {
		it('parse "<my-widget></my-widget>" tagName should be "my-widget"', function () {

			const root = parseHTML('<my-widget></my-widget>');

			root.firstChild.tagName.should.eql('my-widget');
		});
	});

	describe('Custom Element multiple dash', function () {
		it('parse "<my-new-widget></my-new-widget>" tagName should be "my-new-widget"', function () {

			const root = parseHTML('<my-new-widget></my-new-widget>');

			root.firstChild.tagName.should.eql('my-new-widget');
		});
	});
});
