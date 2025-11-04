import re

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    
    if "REGISTRO SUPORTE:" not in content:
        return False

    tipo_relatorio = "REGISTRO SUPORTE"
    staff_mencionados_ids = []

    # Extrai staff que atendeu
    atendeu_match = re.search(r">\s*\*\*STAFF QUE ATENDEU:\*\*\s*(.*)", content, re.IGNORECASE)
    if atendeu_match:
        staff_ids = re.findall(r'<@(\d+)>', atendeu_match.group(1))
        staff_mencionados_ids.extend(staff_ids)

    # Extrai staff que auxiliou
    auxiliou_match = re.search(r">\s*\*\*STAFF QUE AUXILIOU:\*\*\s*(.*)", content, re.IGNORECASE)
    if auxiliou_match:
        staff_ids = re.findall(r'<@(\d+)>', auxiliou_match.group(1))
        staff_mencionados_ids.extend(staff_ids)

    # Extrai o ID do PLAYER ATENDIDO
    user_match = re.search(r">\s*\*\*PLAYER ATENDIDO:\*\*\s*.*?<@(\d+)>", content, re.IGNORECASE)
    if not user_match:
        return False
        
    user_id = int(user_match.group(1))
    
    try:
        await add_report_func(
            message_id=message.id,
            user_id=user_id,
            report_type='support_log',
            jump_url=message.jump_url,
            details=tipo_relatorio,
            staff_mencionado=staff_mencionados_ids,
            tipo_relatorio=tipo_relatorio
        )
        return True
    except Exception as e:
        print(f"[REGISTRO-SUPORTE PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")

    return False