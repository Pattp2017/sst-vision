# Importação de visitas do Google Agenda

## Ativação inicial

1. No Google Cloud Console, selecione ou crie um projeto e ative a **Google Calendar API**.
2. Configure o Google Auth Platform (marca/tela de consentimento, público e acesso aos dados). O aplicativo solicita `https://www.googleapis.com/auth/calendar.readonly`.
3. Se o público for externo e o aplicativo estiver em teste, cadastre os e-mails que usarão a integração como usuários de teste. Para distribuição mais ampla, conclua a publicação/verificação exigida pelo Google.
4. Crie um cliente OAuth do tipo **Aplicativo da Web**. Em **Origens JavaScript autorizadas**, cadastre a origem exata do SST Vision (protocolo e domínio, sem caminho). A própria tela exibe essa origem. O fluxo usa popup, sem endpoint de callback no servidor.
5. Copie o **ID do cliente**, terminado em `.apps.googleusercontent.com`, para Visitas SST → Importar do Google Agenda → Configuração da conexão Google. Não inserir segredo de cliente.
6. Clique em Conectar com Google e escolha a conta que possui permissão para ler os detalhes da agenda compartilhada.

## Uso

Escolha a agenda e o período (inclusive o último dia), busque os eventos, filtre por texto/cliente/consultor, selecione as visitas e confira Empresa / Fazenda. O nome do evento serve apenas como sugestão da empresa. Eventos de dia inteiro exigem preenchimento do horário antes da importação. Horários são exibidos em America/Sao_Paulo.

Novas visitas recebem título/descrição, local e participantes disponíveis. Se o Google não disponibilizar os detalhes de um evento privado, eles precisam ser completados pela pessoa responsável. A busca inclui todas as páginas e expande ocorrências recorrentes.

Ao importar novamente a mesma ocorrência da mesma agenda, atualiza data, horário e duração. Preserva identificador, empresa, local, objetivo, acompanhante, status e observações já revisados no SST Vision. O botão Google Agenda abre o evento original. Edições no formulário preservam o vínculo.

## Limites desta etapa

- Consulta e importação manual; não há sincronização automática nem escrita no Google.
- Eventos cancelados não são importados e não excluem visitas existentes.
- As visitas continuam no localStorage deste navegador, como na versão anterior; não há sincronização entre aparelhos.
- O ID público do cliente fica neste navegador. O token de acesso permanece apenas em memória e precisa ser renovado conectando novamente quando expirar. Desconectar encerra a sessão local do módulo, sem revogar o consentimento da conta Google.
- O service worker não armazena requisições de outras origens ou com cabeçalho Authorization. A versão de cache foi atualizada para remover caches antigos.

## Validação

`node --test tests/google-agenda.test.js`

Cobre conversão de fuso, duração, reimportação sem duplicidade, preservação dos dados da visita, separação por agenda/ocorrência, horário obrigatório em eventos de dia inteiro e rejeição de cancelamentos/empresa vazia.

Validação real pendente de cliente OAuth configurado: conectar conta, listar agenda compartilhada, importar um evento, editar a visita, reagendar no Google e reimportar. Conferir que o relatório permanece associado ao mesmo ID.
