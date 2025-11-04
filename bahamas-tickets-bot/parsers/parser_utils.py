import re
import unicodedata

def normalize_text(text):
    """Remove acentos, pontuação e converte para maiúsculas para uma comparação robusta."""
    if not text:
        return ""
    # Remove acentos
    nfkd_form = unicodedata.normalize('NFKD', text)
    only_ascii = nfkd_form.encode('ASCII', 'ignore')
    # Remove tudo exceto letras e números e junta tudo
    return "".join(re.findall(r'[A-Z0-9]', only_ascii.decode('utf-8').upper()))