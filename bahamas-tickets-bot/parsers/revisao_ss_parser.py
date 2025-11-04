import re

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    
    if "SS-REVISÕES" not in content:
        return False

    tipo_relatorio = "SS-REVISÕES"
    staff_mencionado_id = str(message.author.id)
    
    user_match = re.search(r'PLAYER:\s*<@(\d+)>', content, re.IGNORECASE)
    user_id = int(user_match.group(1)) if user_match else message.author.id
    
    try:
        await add_report_func(
            message_id=message.id,
            user_id=user_id,
            report_type='ss_review',
            jump_url=message.jump_url,
            details=tipo_relatorio,
            staff_mencionado=[staff_mencionado_id], # Sempre guarda quem enviou
            tipo_relatorio=tipo_relatorio
        )
        return True
    except Exception as e:
        print(f"[REVISAO-SS PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")

    return False