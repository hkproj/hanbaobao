const HTML_TONES = new Map([
    ["1", '&#772;'],
    ["2", '&#769;'],
    ["3", '&#780;'],
    ["4", '&#768;'],
    ["5", '']
]);

const UNICODE_TONES = new Map([
    ["1", '\u0304'],
    ["2", '\u0301'],
    ["3", '\u030C'],
    ["4", '\u0300'],
    ["5", '']
]);

export function parse(s: string) {
    return s.match(/([^AEIOU:aeiou]*)([AEIOUaeiou:]+)([^aeiou:]*)([1-5])/);
}


export function tonify(vowels: any, tone: string) {
    let html = '';
    let text = '';

    if (vowels === 'ou') {
        html = 'o' + HTML_TONES.get(tone) + 'u';
        text = 'o' + UNICODE_TONES.get(tone) + 'u';
    } else {
        let tonified = false;
        for (let i = 0; i < vowels.length; i++) {
            let c = vowels.charAt(i);
            html += c;
            text += c;
            if (c === 'a' || c === 'e') {
                html += HTML_TONES.get(tone)!;
                text += UNICODE_TONES.get(tone);
                tonified = true;
            } else if (i === vowels.length - 1 && !tonified) {
                html += HTML_TONES.get(tone)!;
                text += UNICODE_TONES.get(tone);
                tonified = true;
            }
        }
        html = html.replace(/u:/, '&uuml;');
        text = text.replace(/u:/, '\u00FC');
    }

    return [html, text];
}