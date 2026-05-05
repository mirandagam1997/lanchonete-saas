#!/bin/bash
# Script de setup rápido para Railway
# Execute na pasta backend

echo "🚀 Instalando dependências..."
npm install

echo "📦 Verificando variáveis de ambiente..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERRO: DATABASE_URL não configurada"
  exit 1
fi

echo "🗄️  Rodando migration..."
node src/database/migrate.js

echo "✅ Setup completo! Iniciando servidor..."
npm start
