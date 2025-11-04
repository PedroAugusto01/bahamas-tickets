import re

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    tipo_relatorio = None

    if "DENÚNCIA/SOLICITAÇÃO PARA TELAGEM ACEITA" in content:
        tipo_relatorio = "DENÚNCIA/SOLICITAÇÃO PARA TELAGEM ACEITA"
    elif "DENÚNCIA/SOLICITAÇÃO PARA TELAGEM NEGADA" in content:
        tipo_relatorio = "DENÚNCIA/SOLICITAÇÃO PARA TELAGEM NEGADA"

    if not tipo_relatorio:
        return False

    user_match = re.search(r'ID:\s*(\d+)', content)
    if not user_match:
        # Tenta pegar a primeira menção como fallback se não encontrar "ID:"
        user_match_mention = re.search(r'<@(\d+)>', content)
        if not user_match_mention:
            return False
        user_id = int(user_match_mention.group(1))
    else:
        user_id = int(user_match.group(1))


    staff_mencionado_id = str(message.author.id)
    
    try:
        await add_report_func(
            message_id=message.id,
            user_id=user_id,
            report_type='ss_request',
            jump_url=message.jump_url,
            details=tipo_relatorio,
            staff_mencionado=[staff_mencionado_id],
            tipo_relatorio=tipo_relatorio
        )
        return True
    except Exception as e:
        print(f"[DENUNCIA-SS PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")

    return False