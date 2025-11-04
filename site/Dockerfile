# Use uma imagem base do Node.js leve e segura
FROM node:18-alpine

# Defina o diretório de trabalho no contêiner
WORKDIR /app

# Copie os arquivos de manifesto de dependências
COPY package.json package-lock.json ./

# Instale apenas as dependências de produção para uma imagem menor
RUN npm install --production

# Copie o restante dos arquivos do site para o diretório de trabalho
COPY . .

# Exponha a porta que a aplicação vai rodar dentro do contêiner
EXPOSE 3003

# Comando para iniciar o servidor quando o contêiner for executado
CMD [ "node", "server.js" ]