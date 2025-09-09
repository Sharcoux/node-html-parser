import { parse } from '../src'

const missingCloseTags = `<table id="liste">
        <span id="nbResultats">Nombre de résultats : 3308</span><br>
                    <tr style='border: 1px solid #ddd'>
                <td><a class="lien-bouton" href="/detail/0441111U"><b>ECOLE PRIMAIRE PRIVEE
                                                            ST JOSEPH
                                                <br>    
                            ABBARETZ (44)
                    <br>
                    </a>
                </td>
            </tr>
                    <tr style='border: 1px solid #ddd'>
                <td><a class="lien-bouton" href="/detail/0441527W"><b>ECOLE PRIMAIRE PUBLIQUE
                                                            LOUIS DAVY
                                                <br>    
                            ABBARETZ (44)
                    <br>
                    </a>
                </td>
            </tr>
</table>`;

describe('Broken HTML', () => {
    it('should parse despite missing close tags', () => {
        const root = parse(missingCloseTags);
        expect(root.querySelectorAll('tr').length).toEqual(2);
    });

    it('should parse despite missing space between attributes', () => {
        const root = parse(`<body>
  <div class="a"data-test="/test.jpg"></div>
  <div class="b"style="background-image:url('test.jpg')"></div>
</body>`);
        expect(root.children[0]?.children.length).toEqual(2);
        expect(root.children[0]?.children[0]?.attributes['data-test']).toEqual(`/test.jpg`);
        expect(root.children[0]?.children[1]?.attributes.style).toEqual(`background-image:url('test.jpg')`);
    });
});
