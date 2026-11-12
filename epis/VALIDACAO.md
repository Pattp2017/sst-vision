# Validação do módulo EPI

Origem: Pattp2017/epis, commit 9713625e9f81f5ca0b3ee270ffa1788034493e6e.
A interface antes carregada remotamente foi incorporada do commit 8a442d37eb99ee11ffa96e990de7efea54b6f95c, com os mesmos scripts adicionais da entrada atual.

Esta etapa preserva o login, as permissões por usuário, a seleção de empresa e o banco atual. Os scripts de cotações compartilham a conexão Supabase do aplicativo.

## Testar online

1. No endereço de validação, clique em Abrir EPIs.
2. Entre com seu usuário e selecione uma empresa autorizada.
3. Confira matriz de cargos, itens e colaboradores.
4. Confira entradas, saídas, estoque, histórico e programação de trocas.
5. Gere as fichas individual, coletiva e de uniformes/outros itens; confira as imagens e impressão.
6. Confira cotação e recebimento, usando registros próprios de teste.
7. Volte ao menu e abra Treinamento para conferir a navegação.

Os dados são do banco atual: identifique os registros novos como TESTE.

## Verificação

Sintaxe JavaScript, referências locais e IDs da interface verificados. A abertura da tela de login e o retorno ao menu foram verificados no navegador. A autenticação, gravações e documentos com dados reais dependem da validação da usuária.

A main e os repositórios originais permanecem intactos. Checklist fica para a próxima etapa.
