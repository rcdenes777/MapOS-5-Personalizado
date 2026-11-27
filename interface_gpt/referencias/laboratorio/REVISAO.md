# Revisão independente — laboratório nativo

**Parecer:** aprovado, sem bloqueantes, em 27/11/2026. Esta nota registra o
parecer posterior ao estado “pendente” preservado em `RELATORIO.md`.

O revisor independente examinou os 18 artefatos existentes antes desta nota e
confirmou que o índice Git, o worktree e o manifesto coincidiam. SHA-256 do
manifesto local: `9f642b12297161e8a8f66e2884d7787d6ab996f96b5862a2eadc62dbc43b4312`.
O manifesto descreve os arquivos anteriores à criação desta nota; não é uma
identidade auto-referente do commit.

A revisão confirmou a chamada do guard antes das credenciais nos oito scripts,
o alvo vivo e três negativos simulados, a execução bem-sucedida dos nove
scripts, a identidade da base nativa e a correção do índice Git. A reauditoria
conferiu o delta documental e não identificou bloqueantes.

Limites: PHPUnit de 2.051 testes/10.812 assertivas foi evidência anterior, não
reexecutada pelo revisor. A reconstrução em outro host e persistência após
reboot não foram testadas; a imagem PHP local e o vendor são pré-requisitos.
O socket tem modo 0666 em diretório privado 0700; a conta e o host permanecem a
fronteira de confiança. Credenciais e dados são sintéticos.
