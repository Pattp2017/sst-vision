# Validação do Checklist

Origem: Pattp2017/checklist, commit 45785b299bf7c48cebc8f7d7659e1e47f10fdf7f.

O módulo foi incorporado em checklist/. Mantém banco, fotos, persistência local e fila offline do original. O relatório usa ../relatorio-visita.html, com configuração do Treinamento local.

O cache offline se limita à pasta do Checklist e a arquivos estáticos enumerados; não armazena respostas do banco nem remove caches dos outros módulos.

## Testar online

1. Clique em Abrir Checklist no endereço de validação.
2. Confira os cadastros de locais, itens e modelos.
3. Crie uma vistoria identificada como TESTE; confirme empresa, modelo, responsáveis e data.
4. Confira os itens por local, status, observação, medida corretiva e fotos.
5. Salve, saia e reabra a vistoria; confira a persistência.
6. Gere o relatório e confira dados, imagens, cabeçalho e impressão.
7. Confira inspeção de extintores e mapa de risco.
8. Para validar offline, carregue previamente uma vistoria de teste e seus recursos, desconecte, registre alterações e confira a sincronização ao reconectar.

Usa o banco atual. Alterações salvas também aparecem no sistema original.

## Verificado

- Sintaxe de scripts externos e inline; referências locais.
- Abertura do menu e formulário de novo Checklist, carregamento dos modelos do banco e expansão do menu de cadastros no navegador.
- Isolamento e limpeza restrita do cache.

Gravações, fotos, documentos e sincronização offline completa aguardam validação da usuária. O arquivo DOCM do repositório original não é referenciado pelo aplicativo e não faz parte do frontend migrado.

A main e os repositórios originais permanecem intactos.
