import { iniciarAutocompletes } from '../../lib/autocomplete.js';
import equipamento from './equipamento.js';
export default function iniciar(secao) {
    iniciarAutocompletes(secao);
    equipamento(secao);
}
