# Use uma imagem base do Python
FROM python:3.9-slim

# Defina o diretório de trabalho no contêiner
WORKDIR /app

# Copie o arquivo de dependências primeiro para aproveitar o cache
COPY requirements.txt .
# Instale as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copie todo o resto do projeto para o diretório de trabalho
COPY . .

# Comando para iniciar o bot quando o contêiner for iniciado
CMD ["python", "main.py"]