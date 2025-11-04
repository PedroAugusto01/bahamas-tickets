// Define a ordem de exibição dos cargos usando a sigla como referência
window.METAS_ORDER = ["HLP", "SUP.T", "SUP", "MOD.T", "MOD", "ADM.T", "ADM", "SPV", "CRO", "CTO", "CM", "COO"];

// Contém os dados das metas para cada cargo
window.METAS_CONFIG = [
    {
        "nome_cargo": "Helper",
        "sigla_cargo": "EST",
        "discord_role_id": "1057449410180685944",
        "metas": {
            "HORAS": 30,
            "DÚVIDAS": 50,
            "ATENDIMENTO SUPORTE": 100,
            "CHAMADOS CIDADE": 150,
            "BAN HACK": 0
        }
    },
    {
        "nome_cargo": "Suporte.T",
        "sigla_cargo": "SUP.T",
        "discord_role_id": "1057449408142246038",
        "metas": {
            "HORAS": 60,
            "ATENDIMENTO SUPORTE": 200,
            "AUXÍLIO SUPORTE": 0,
            "CHAMADOS CIDADE": 250,
            "TICKET DENUNCIA": 90,
            "BAN HACK": 20,
            "TICKET DENUNCIA SS": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Suporte",
        "sigla_cargo": "SUP",
        "discord_role_id": "1057449408142246038",
        "metas": {
            "HORAS": 60,
            "ATENDIMENTO SUPORTE": 200,
            "AUXÍLIO SUPORTE": 0,
            "CHAMADOS CIDADE": 250,
            "TICKET DENUNCIA": 90,
            "BAN HACK": 20,
            "TICKET DENUNCIA SS": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Moderador.T",
        "sigla_cargo": "MOD.T",
        "discord_role_id": "1311493209599246367",
        "metas": {
            "HORAS": 90,
            "ATENDIMENTO SUPORTE": 200,
            "AUXÍLIO SUPORTE": 0,
            "CHAMADOS CIDADE": 30,
            "TICKET DENUNCIA": 90,
            "TICKET REVISÃO": 100,
            "BAN HACK": 30,
            "TICKET DENUNCIA SS": 0,
            "TICKET REVISÃO LUPA": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Moderador",
        "sigla_cargo": "MOD",
        "discord_role_id": "1311493209599246367",
        "metas": {
            "HORAS": 90,
            "ATENDIMENTO SUPORTE": 200,
            "AUXÍLIO SUPORTE": 0,
            "CHAMADOS CIDADE": 30,
            "TICKET DENUNCIA": 90,
            "TICKET REVISÃO": 100,
            "BAN HACK": 30,
            "TICKET DENUNCIA SS": 0,
            "TICKET REVISÃO LUPA": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Administrador.T",
        "sigla_cargo": "ADM.T",
        "discord_role_id": "1311492362605690910",
        "metas": {
            "HORAS": 90,
            "ATENDIMENTO SUPORTE": 100,
            "AUXÍLIO SUPORTE": 150,
            "CHAMADOS CIDADE": 0,
            "TICKET DENUNCIA": 50,
            "TICKET REVISÃO": 150,
            "DEVOLUÇÃO": 60,
            "BAN HACK": 0,
            "TICKET DENUNCIA SS": 0,
            "TICKET REVISÃO LUPA": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Administrador",
        "sigla_cargo": "ADM",
        "discord_role_id": "1311492362605690910",
        "metas": {
            "HORAS": 90,
            "ATENDIMENTO SUPORTE": 100,
            "AUXÍLIO SUPORTE": 150,
            "CHAMADOS CIDADE": 0,
            "TICKET DENUNCIA": 50,
            "TICKET REVISÃO": 150,
            "DEVOLUÇÃO": 60,
            "BAN HACK": 0,
            "TICKET DENUNCIA SS": 0,
            "TICKET REVISÃO LUPA": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Supervisor",
        "sigla_cargo": "SPV",
        "discord_role_id": "1086310207858163712",
        "metas": {
            "HORAS": 90,
            "ATENDIMENTO SUPORTE": 50,
            "TICKET GERAL": 50,
            "DEVOLUÇÃO": 30,
            "BAN HACK": 0,
            "TICKET DENUNCIA SS": 0,
            "TICKET REVISÃO LUPA": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Coordenador",
        "sigla_cargo": "CRO",
        "discord_role_id": "1057449400634454026",
        "metas": {
            "HORAS": 90,
            "ATENDIMENTO SUPORTE": 50,
            "TICKET GERAL": 50,
            "DEVOLUÇÃO": 30,
            "BAN HACK": 0,
            "TICKET DENUNCIA SS": 0,
            "TICKET REVISÃO LUPA": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Chefe Administrador",
        "sigla_cargo": "CTO",
        "discord_role_id": "1057449398721855498",
        "metas": {
            "HORAS": 90,
            "ATENDIMENTO SUPORTE": 50,
            "TICKET GERAL": 50,
            "DEVOLUÇÃO": 30,
            "BAN HACK": 0,
            "TICKET DENUNCIA SS": 0,
            "TICKET REVISÃO LUPA": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Community Manager",
        "sigla_cargo": "CM",
        "discord_role_id": "1057449397719416952",
        "metas": {
            "HORAS": 90,
            "ATENDIMENTO SUPORTE": 50,
            "TICKET GERAL": 50,
            "DEVOLUÇÃO": 30,
            "BAN HACK": 0,
            "TICKET DENUNCIA SS": 0,
            "TICKET REVISÃO LUPA": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    },
    {
        "nome_cargo": "Chefe Geral",
        "sigla_cargo": "COO",
        "discord_role_id": "1102984564005154969",
        "metas": {
            "HORAS": 90,
            "ATENDIMENTO SUPORTE": 50,
            "TICKET GERAL": 50,
            "DEVOLUÇÃO": 30,
            "BAN HACK": 0,
            "TICKET DENUNCIA SS": 0,
            "TICKET REVISÃO LUPA": 0,
            "TELAGENS REALIZADAS": 0,
            "BAN HACK FLAGRANTE": 0
        }
    }
];