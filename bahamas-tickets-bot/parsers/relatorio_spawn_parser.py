import re

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content

    tipo_relatorio = "RELATÓRIO SPAWN"
    staff_mencionados_ids = []

    # Busca quem realizou a ação para manter o registro, se houver
    realizado_por_match = re.search(r"REALIZADO POR:\s*(.*)", content, re.IGNORECASE)
    if realizado_por_match:
        staff_ids = re.findall(r'<@(\d+)>', realizado_por_match.group(1))
        if staff_ids:
            staff_mencionados_ids.extend(staff_ids)
    
    # Garante que o autor da mensagem (quem está fazendo o relatório) esteja sempre na lista
    author_id_str = str(message.author.id)
    if author_id_str not in staff_mencionados_ids:
        staff_mencionados_ids.append(author_id_str)

    user_id = message.author.id
    
    try:
        await add_report_func(
            message_id=message.id,
            user_id=user_id,
            report_type='spawn_report',
            jump_url=message.jump_url,
            details=tipo_relatorio,
            staff_mencionado=staff_mencionados_ids,
            tipo_relatorio=tipo_relatorio
        )
        return True
    except Exception as e:
        print(f"[RELATORIO-SPAWN PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")

    return False