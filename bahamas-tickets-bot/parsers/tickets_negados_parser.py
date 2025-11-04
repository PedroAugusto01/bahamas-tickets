import re
from .parser_utils import normalize_text

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    tipo_relatorio = None

    if "DENÚNCIA NEGADA" in content or "DENÚNCIA NEGADO" in content:
        tipo_relatorio = "TICKET-DENÚNCIA NEGADO"
    elif "REVISÃO NEGADO" in content or "REVISÃO NEGADA" in content:
        tipo_relatorio = "TICKET-REVISÃO NEGADO"
        
    if not tipo_relatorio:
        return False

    KEY_STAFF = normalize_text("STAFFQUEJULGOU")
    KEY_STAFF_AUXILIOU = normalize_text("STAFFQUEAUXILIOU")
    staff_mencionados_ids = []

    for line in content.split('\n'):
        normalized_line = normalize_text(line)
        if KEY_STAFF in normalized_line:
            staff_ids = re.findall(r'<@(\d+)>', line)
            if staff_ids:
                staff_mencionados_ids.extend(staff_ids)

    for line in content.split('\n'):
        normalized_line = normalize_text(line)
        if KEY_STAFF_AUXILIOU in normalized_line:
            staff_ids = re.findall(r'<@(\d+)>', line)
            if staff_ids:
                staff_mencionados_ids.extend(staff_ids)

    # Assumindo que o player negado é o primeiro mencionado na mensagem
    user_match = re.search(r'<@(\d+)>', content)
    if user_match:
        user_id = int(user_match.group(1))
        try:
            await add_report_func(
                message_id=message.id,
                user_id=user_id,
                report_type='ticket_denied',
                jump_url=message.jump_url,
                details=f"Ticket negado: {tipo_relatorio}",
                staff_mencionado=staff_mencionados_ids,
                tipo_relatorio=tipo_relatorio
            )
            return True
        except Exception as e:
            print(f"[TICKETS-NEGADOS PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")
    
    return False