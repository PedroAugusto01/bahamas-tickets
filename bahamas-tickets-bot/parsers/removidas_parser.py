import re
from .parser_utils import normalize_text

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    
    user_id = None
    ticket_id = None
    removed_role_ids = []
    reverted_role_ids = []
    staff_mencionados_ids = []
    tipo_relatorio = None

    KEY_PLAYER = normalize_text("PLAYERSOLICITANTE")
    KEY_REMOVIDA = normalize_text("PUNICAOREMOVIDA")
    KEY_REVERTIDA = normalize_text("PUNICAOCONVERTIDAEM")
    KEY_TICKET = normalize_text("NUMERODOTICKET")
    KEY_STAFF = normalize_text("STAFFQUEJULGOU")
    KEY_AUXILIAR = normalize_text("STAFFQUEAUXILIOU")

    if "REVISÃO ACEITA" in content:
        tipo_relatorio = "RELATÓRIO REVISÃO-ACEITA"

    lines = content.split('\n')
    for line in lines:
        normalized_line = normalize_text(line)

        if KEY_TICKET in normalized_line:
            ticket_match = re.search(r'(\d+)', line)
            if ticket_match:
                ticket_id = ticket_match.group(1)

        if KEY_PLAYER in normalized_line:
            user_match = re.search(r'<@(\d+)>', line)
            if user_match:
                user_id = int(user_match.group(1))

        if KEY_REMOVIDA in normalized_line:
            found_ids = re.findall(r'<@&(\d+)>', line)
            if found_ids:
                removed_role_ids.extend(found_ids)

        if KEY_REVERTIDA in normalized_line:
            found_ids = re.findall(r'<@&(\d+)>', line)
            if found_ids:
                reverted_role_ids.extend(found_ids)
        
        if KEY_STAFF in normalized_line:
            staff_ids = re.findall(r'<@(\d+)>', line)
            if staff_ids:
                staff_mencionados_ids.extend(staff_ids)

        if KEY_AUXILIAR in normalized_line:
            staff_ids = re.findall(r'<@(\d+)>', line)
            if staff_ids:
                staff_mencionados_ids.extend(staff_ids)

    if not user_id:
        return False

    # Cenário 1: Reversão
    if removed_role_ids and reverted_role_ids:
        details = f"{{'removida': {removed_role_ids}, 'revertida': {reverted_role_ids}}}"
        try:
            await add_report_func(message.id, user_id, ticket_id, 'adv_reverted', message.jump_url, details, staff_mencionado=staff_mencionados_ids, tipo_relatorio=tipo_relatorio)
            return True
        except Exception as e:
            print(f"[REMOVIDAS PARSER] ERRO ao salvar REVERSÃO para msg {message.id}: {e}")
            return False

    # Cenário 2: Remoção Simples
    if removed_role_ids:
        details = str(removed_role_ids)
        try:
            await add_report_func(message.id, user_id, ticket_id, 'adv_removed', message.jump_url, details, staff_mencionado=staff_mencionados_ids, tipo_relatorio=tipo_relatorio)
            return True
        except Exception as e:
            print(f"[REMOVIDAS PARSER] ERRO ao salvar REMOÇÃO SIMPLES para msg {message.id}: {e}")
            return False
            
    # Cenário 3: Remoção Genérica
    if tipo_relatorio == "RELATÓRIO REVISÃO-ACEITO":
        try:
            await add_report_func(message.id, user_id, ticket_id, 'adv_removed', message.jump_url, "Punição Removida (Admin)", staff_mencionado=staff_mencionados_ids, tipo_relatorio=tipo_relatorio)
            return True
        except Exception as e:
             print(f"[REMOVIDAS PARSER] ERRO ao salvar REMOÇÃO GENÉRICA para msg {message.id}: {e}")

    return False