import re
from .parser_utils import normalize_text

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    
    # Verifica se é um relatório de bug
    if "RELATÓRIO BUG" not in content:
        return False
    
    tipo_relatorio = "RELATÓRIO BUG"
    user_id = None
    game_id = None
    ticket_id = None
    details = None
    staff_mencionados_ids = []
    
    # Chaves normalizadas para busca (remove acentos e formatação)
    KEY_ID = normalize_text("ID")
    KEY_DISCORD = normalize_text("DISCORD")
    KEY_TICKET = normalize_text("TICKET")
    KEY_MOTIVO = normalize_text("MOTIVO")
    KEY_STAFF = normalize_text("STAFFQUEJULGOU")
    
    lines = content.split('\n')
    for line in lines:
        normalized_line = normalize_text(line)
        
        # Extração do ID do Jogo (procura por números após "ID")
        # Exemplo: **ID:** 4022
        if KEY_ID in normalized_line and not user_id: 
             # Regex flexível para pegar o número após "ID" e possíveis asteriscos/espaços
             match = re.search(r'ID.*?\s*(\d+)', line, re.IGNORECASE)
             if match:
                 try:
                    game_id = int(match.group(1))
                 except ValueError:
                    pass
        
        # Extração do Discord
        # Exemplo: **DISCORD:** <@1110008937392119939>
        if KEY_DISCORD in normalized_line:
            match = re.search(r'<@!?(\d+)>', line)
            if match:
                user_id = int(match.group(1))
                
        # Extração do Ticket
        # Exemplo: **TICKET:** 200099
        if KEY_TICKET in normalized_line:
            match = re.search(r'(\d+)', line)
            if match:
                ticket_id = match.group(1)
        
        # Extração do Motivo
        # Exemplo: **MOTIVO:** Veiculo desmanchado por hack
        if KEY_MOTIVO in normalized_line:
            # Divide a linha no primeiro ':' e pega a segunda parte
            parts = line.split(':', 1)
            if len(parts) > 1:
                # Remove asteriscos e espaços extras
                details = parts[1].replace('*', '').strip()
        
        # Extração da Staff
        # Exemplo: **STAFF QUE JULGOU:** <@1301341956911272009>
        if KEY_STAFF in normalized_line:
            staff_ids = re.findall(r'<@!?(\d+)>', line)
            staff_mencionados_ids.extend(staff_ids)

    if user_id:
        # Se tivermos ambos os IDs, vinculamos no banco de dados
        if game_id:
            await link_user_ids_func(user_id, game_id)
            
        try:
            await add_report_func(
                message_id=message.id,
                user_id=user_id,
                ticket_id=ticket_id,
                report_type='ticket_bug', # Novo tipo de relatório
                jump_url=message.jump_url,
                details=details or "Sem motivo informado",
                staff_mencionado=staff_mencionados_ids,
                tipo_relatorio=tipo_relatorio
            )
            return True
        except Exception as e:
            print(f"[TICKET-BUG PARSER] ERRO ao salvar msg {message.id}: {e}")
            return False
            
    return False