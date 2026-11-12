# Migração do módulo Treinamento

Esta etapa incorpora somente o frontend do Treinamento ao SST Vision.
Origem: Pattp2017/treinamento, commit d9a6ac4c0963844bd7f69e3c4b7810468b650907.
Destino: branch migracao-modulos, pasta treinamento/.

## Executar para validação

Baixe ou faça checkout desta branch e, na raiz do repositório, execute:

```sh
python -m http.server 8000
```

Abra http://localhost:8000/ e clique em Treinamentos.
A branch não altera a versão publicada da main.

## Validar antes de avançar

- Abrir Dashboard, Cadastros, Agenda, Turmas, Vencimentos, Histórico e Configurações.
- Conferir dados e filtros de cliente e instrutor.
- Com registros próprios de teste, salvar e editar cadastro, agenda e turma.
- Gerar lista de presença, certificados, termo de imagem e relatório de vencimentos.
- Conferir imagens, paginação, pasta e nome dos arquivos.
- Conferir atalhos Ctrl+G e Ctrl+Delete com registros de teste.
- Voltar ao SST Vision pelo menu.

O módulo preserva a configuração e o banco usados pelo sistema original.
Gravações nesta branch afetam o mesmo banco; use registros identificados como teste.
Nenhuma migração SQL foi executada. URLs de imagens cadastradas no banco foram preservadas.
As bibliotecas de PDF continuam carregadas por CDN; precisam de internet.
Os arquivos Apps Script antigos não foram incorporados: a entrada migrada é o frontend index.html e seus scripts.

## Verificações realizadas

- Sintaxe de 16 scripts do módulo, service-worker.js e scripts inline.
- Referências locais de scripts.
- Isolamento do cache: requisições de Treinamento e banco não entram no cache.
- Exclusão de caches limitada ao prefixo da instalação atual.
- git diff --check.

Validação visual e fluxos completos de gravação e documentos ainda pendentes:
o navegador local não pôde iniciar por restrição do ambiente.
EPIs, Checklist, book, campocheck e Rainforest não fazem parte desta etapa.
