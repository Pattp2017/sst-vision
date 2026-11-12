# Uso em campo sem internet

## Preparar o aparelho

Abra o painel com internet no mesmo navegador que usará em campo. Aguarde a mensagem **Recursos offline preparados neste aparelho**. A preparação guarda os arquivos do painel, Análise de Risco, Checklist e Mapa de Risco. Bibliotecas PDF foram incorporadas localmente.

## Checklist

Abra previamente cada vistoria que será usada e confirme o carregamento de seu modelo. Permanecem o salvamento local e a fila de sincronização originais. Criar uma nova vistoria com cadastros ainda não carregados requer internet. A carga dos arquivos não baixa automaticamente todas as vistorias e fotos do banco.

## Análise de Risco

Fotos, dados e achados são guardados como rascunhos em IndexedDB neste aparelho. Há salvamento após alterações e botão **Salvar neste aparelho**. A lista **Rascunhos de análise neste aparelho** permite reabrir registros, inclusive com foto e achados manuais.

Sem internet, os comandos de IA e validação não enviam dados: guardam o rascunho local. Ao reconectar, abra o rascunho, revise e execute a análise/validação explicitamente. Não há envio automático de análises ao servidor, evitando gravações duplicadas e validações sem revisão. Análises já enviadas ao servidor não são todas baixadas para consulta offline.

## Mapa de Risco

A etapa atual permite ler o PGRTR em PDF e organizar ambientes no aparelho, com recuperação do PDF e da seleção ao reabrir a página. A geração final de mapas permanece a etapa futura já indicada pelo módulo. O leitor PDF e seu worker são locais; eval dinâmico foi desabilitado na leitura.

## Conferência

- Navegador: rascunho com empresa/setor/observação salvo e reaberto; foto de teste salva e recuperada após recarga.
- Navegador: PDF sintético lido localmente; PDF, ambientes e seleção recuperados após recarga.
- Falha de rede simulada no worker: painel, rotas com parâmetros, análise, Checklist, mapa e PDF retornam arquivos do cache. Banco e backend permanecem fora do cache estático.
- O ciclo físico de desligar a conexão no aparelho da usuária e a sincronização completa do Checklist precisam ser validados em campo.
- Nenhum registro do banco alterado nos testes; os exemplos foram guardados apenas no navegador de QA.

Cadastros centrais, Treinamento, EPIs, IA e consultas ao servidor continuam online nesta etapa.
