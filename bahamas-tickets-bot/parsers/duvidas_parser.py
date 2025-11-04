async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    
    # ID do cargo obrigatório
    REQUIRED_ROLE_ID = 1057449425728974989

    # Verifica se o autor tem o cargo necessário
    if not message.author or not any(role.id == REQUIRED_ROLE_ID for role in message.author.roles):
        return False

    user_id = message.author.id
    staff_mencionado_id = str(user_id)
    tipo_relatorio = "Dúvida"
    
    # Não processa mensagens sem conteúdo
    if not message.content:
        return False
        
    try:
        await add_report_func(
            message_id=message.id,
            user_id=user_id,
            report_type='question',
            jump_url=message.jump_url,
            details=message.content,
            staff_mencionado=[staff_mencionado_id],
            tipo_relatorio=tipo_relatorio
        )
        return True
    except Exception as e:
        print(f"[DUVIDAS PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")

    return False