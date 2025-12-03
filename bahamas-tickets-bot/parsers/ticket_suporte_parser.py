import re
from .parser_utils import normalize_text

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    
    # Verifica se é um relatório de suporte
    if "RELATÓRIO SUPORTE" not in content:
        return False
    
    tipo_relatorio = "RELATÓRIO SUPORTE"
    user_id = None
    game_id = None
    ticket_id = None
    details = None
    staff_mencionados_ids = []
    
    KEY_ID = normalize_text("ID")
    KEY_DISCORD = normalize_text("DISCORD")
    KEY_TICKET = normalize_text("TICKET")
    KEY_MOTIVO = normalize_text("MOTIVO")
    KEY_STAFF = normalize_text("STAFFQUEJULGOU")
    
    lines = content.split('\n')
    for line in lines:
        normalized_line = normalize_text(line)
        
        if KEY_ID in normalized_line and not user_id: 
             match = re.search(r'ID.*?\s*(\d+)', line, re.IGNORECASE)
             if match:
                 try:
                    game_id = int(match.group(1))
                 except ValueError:
                    pass
        
        if KEY_DISCORD in normalized_line:
            match = re.search(r'<@!?(\d+)>', line)
            if match:
                user_id = int(match.group(1))
                
        if KEY_TICKET in normalized_line:
            match = re.search(r'(\d+)', line)
            if match:
                ticket_id = match.group(1)
        
        if KEY_MOTIVO in normalized_line:
            parts = line.split(':', 1)
            if len(parts) > 1:
                details = parts[1].replace('*', '').strip()
        
        if KEY_STAFF in normalized_line:
            staff_ids = re.findall(r'<@!?(\d+)>', line)
            staff_mencionados_ids.extend(staff_ids)

    if user_id:
        if game_id:
            await link_user_ids_func(user_id, game_id)
            
        try:
            await add_report_func(
                message_id=message.id,
                user_id=user_id,
                ticket_id=ticket_id,
                report_type='ticket_support', # Novo tipo para diferenciar do log de call
                jump_url=message.jump_url,
                details=details or "Resolvido",
                staff_mencionado=staff_mencionados_ids,
                tipo_relatorio=tipo_relatorio
            )
            return True
        except Exception as e:
            print(f"[TICKET-SUPORTE PARSER] ERRO ao salvar msg {message.id}: {e}")
            return False
            
    return False