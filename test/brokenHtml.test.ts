import { parse } from '../src'

const brokenHtml = `<table id="liste">
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
    it('should parse the broken HTML', () => {
        const root = parse(brokenHtml);
        expect(root.querySelectorAll('tr').length).toEqual(2);
    });
});