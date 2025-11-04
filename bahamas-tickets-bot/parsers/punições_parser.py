import re
from .parser_utils import normalize_text
from datetime import timedelta

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    
    KEY_DISCORD = normalize_text("DISCORD")
    KEY_PUNICAO = normalize_text("PUNIÇÃO/BAN")
    KEY_TICKET = normalize_text("TICKET")
    KEY_STAFF = normalize_text("STAFFQUEJULGOU")

    # Extrai o tipo de relatório, Ticket ID e Staff da mensagem inteira uma vez
    global_ticket_id = None
    staff_mencionados_ids = []
    tipo_relatorio = None

    if "RELATÓRIO PRISÃO-STAFF" in content:
        tipo_relatorio = "RELATÓRIO PRISÃO-STAFF"
        staff_mencionados_ids = [str(message.author.id)]
    elif "RELATÓRIO PRISÃO" in content:
        tipo_relatorio = "RELATÓRIO PRISÃO"
    elif "DENUNCIA ACEITA" in content:
        tipo_relatorio = "RELATÓRIO ADV/BAN"

    for line in content.split('\n'):
        normalized_line = normalize_text(line)
        if KEY_TICKET in normalized_line:
            ticket_match = re.search(r'(\d+)', line)
            if ticket_match:
                global_ticket_id = ticket_match.group(1)
        
        if tipo_relatorio != "RELATÓRIO PRISÃO-STAFF" and KEY_STAFF in normalized_line:
            staff_ids = re.findall(r'<@(\d+)>', line)
            if staff_ids:
                staff_mencionados_ids.extend(staff_ids)

    report_blocks = re.split(r'(?=\**\s*(?:ID|DISCORD)\s*:\s*\**)', content, flags=re.IGNORECASE)
    reports_saved_count = 0

    for block in report_blocks:
        if not block.strip() or "Temporada/Season" in block:
            continue

        user_id = None
        role_ids = []

        lines = block.strip().split('\n')
        for line in lines:
            normalized_line = normalize_text(line)

            if KEY_DISCORD in normalized_line:
                user_match = re.search(r'<@(\d+)>', line)
                if user_match:
                    user_id = int(user_match.group(1))

            if KEY_PUNICAO in normalized_line:
                found_ids = re.findall(r'<@&(\d+)>', line)
                if found_ids:
                    role_ids.extend(found_ids)

        if user_id:
            db_message_id = f"{message.id}-{reports_saved_count}" if reports_saved_count > 0 else message.id
            timestamp_with_offset = message.created_at + timedelta(seconds=reports_saved_count)
            details_string = str(role_ids) if role_ids else "Prisão-Staff"
            
            try:
                await add_report_func(
                    message_id=db_message_id, 
                    user_id=user_id,
                    ticket_id=global_ticket_id,
                    report_type='adv_applied', 
                    jump_url=message.jump_url, 
                    details=details_string,
                    timestamp=timestamp_with_offset,
                    staff_mencionado=staff_mencionados_ids,
                    tipo_relatorio=tipo_relatorio
                )
                reports_saved_count += 1
            except Exception as e:
                print(f"[PUNIÇÕES PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")

    return reports_saved_count > 0