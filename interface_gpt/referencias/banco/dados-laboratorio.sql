-- MapOS 5 Personalizado — fixtures fictícias de laboratório.
-- Nenhum registro real, senha, hash de senha, token ou credencial.
-- Os campos de senha usam um marcador inválido de propósito: o login não funciona
-- até que um hash seja gerado localmente. Não executar em produção.
-- Depende de schema-producao.sql já importado em banco vazio.

SET NAMES utf8mb4;
START TRANSACTION;

-- Permissão, operador e cliente fictícios.
INSERT INTO permissoes (idPermissao, nome, permissoes, situacao, data, exigir_2fa) VALUES
  (1, 'Laboratório fictício', '{}', 1, '2026-10-01', 0);

INSERT INTO usuarios (idUsuarios, nome, cpf, cep, email, senha, telefone, situacao, dataCadastro, permissoes_id) VALUES
  (1, 'Técnico Fictício', 'FICTICIO-0001', '00000-000', 'tecnico.lab@example.invalid',
   'LAB-ONLY-NOT-A-HASH', '(00) 0000-0000', 1, '2026-10-01', 1);

INSERT INTO clientes (idClientes, nomeCliente, sexo, pessoa_fisica, documento, telefone, celular, email, senha,
                      dataCadastro, rua, numero, bairro, cidade, estado, cep, contato, complemento, fornecedor) VALUES
  (1, 'Cliente Fictício Alfa', 'Não informado', 1, 'FICTICIO-0001', '(00) 0000-0000', '(00) 90000-0000',
   'cliente.alfa@example.invalid', 'LAB-ONLY-NOT-A-HASH', '2026-10-01', 'Rua Fictícia', '100',
   'Bairro Fictício', 'Cidade Fictícia', 'SP', '00000-000', 'Contato Fictício', 'Sala 1', 0);

-- Cadastros de apoio.
INSERT INTO marcas (idMarcas, marca, cadastro, situacao) VALUES
  (1, 'Marca Fictícia', '2026-10-01', 1);

INSERT INTO categorias (idCategorias, categoria, cadastro, status, tipo) VALUES
  (1, 'Receita fictícia de laboratório', '2026-10-01', 1, 'receita');

INSERT INTO contas (idContas, conta, banco, numero, saldo, cadastro, status, tipo) VALUES
  (1, 'Conta fictícia de laboratório', 'Banco Fictício', '0000-0', 0.00, '2026-10-01', 1, 'Conta corrente');

INSERT INTO produtos (idProdutos, codDeBarra, descricao, unidade, precoCompra, precoVenda, estoque, estoqueMinimo, saida, entrada) VALUES
  (1, 'LAB-PROD-0001', 'Produto Fictício Alfa', 'UN', 50.00, 120.00, 8, 2, 1, 1);

INSERT INTO servicos (idServicos, nome, descricao, preco) VALUES
  (1, 'Diagnóstico Fictício', 'Diagnóstico fictício de laboratório', 80.00);

INSERT INTO equipamentos (idEquipamentos, equipamento, num_serie, modelo, cor, descricao, tensao, potencia, voltagem, data_fabricacao, marcas_id, clientes_id) VALUES
  (1, 'Notebook Fictício', 'LAB-SERIE-0001', 'Modelo Alfa', 'Cinza', 'Equipamento fictício de laboratório',
   'Bivolt', '65 W', '110/220 V', '2025-01-01', 1, 1);

-- Unidade moderna (Trifase) e vínculo com a OS.
INSERT INTO trifase_equipamento_modelos (id, tipo, marca, modelo, chave, usuario_id, atualizado_em) VALUES
  (1, 'Notebook', 'Marca Fictícia', 'Modelo Alfa', REPEAT('0', 64), 1, '2026-10-01 09:00:00');

INSERT INTO trifase_equipamentos (id, modelo_id, cliente_id, selo, selo_chave, serie, imei, usuario_id, criado_em) VALUES
  (1, 1, 1, 'LAB-SELO-0001', NULL, 'LAB-SERIE-0001', '000000000000001', 1, '2026-10-01 09:10:00');

-- OS 1: atendimento concluído, faturado e entregue.
INSERT INTO os (idOs, dataInicial, dataFinal, garantia, descricaoProduto, defeito, status, observacoes,
                laudoTecnico, valorTotal, desconto, valor_desconto, tipo_desconto,
                clientes_id, usuarios_id, lancamento, faturado, garantias_id) VALUES
  (1, '2026-11-01', '2026-11-03', '90 dias (fictício)', 'Notebook Fictício Modelo Alfa',
   'Não liga (fictício)', 'Finalizado', 'Registro criado exclusivamente para laboratório.',
   'Substituição de componente fictício.', 320.00, 0.00, 0.00, NULL,
   1, 1, NULL, 1, NULL);

INSERT INTO produtos_os (idProdutos_os, quantidade, descricao, preco, os_id, produtos_id, subTotal, desconto, tipo_desconto) VALUES
  (1, 2, 'Produto Fictício Alfa', 120.00, 1, 1, 240.00, 0.00, NULL);

INSERT INTO servicos_os (idServicos_os, servico, quantidade, preco, os_id, servicos_id, subTotal, desconto, tipo_desconto) VALUES
  (1, 'Diagnóstico Fictício', 1, 80.00, 1, 1, 80.00, 0.00, NULL);

INSERT INTO equipamentos_os (idEquipamentos_os, defeito_declarado, defeito_encontrado, solucao, equipamentos_id, os_id) VALUES
  (1, 'Não liga (fictício)', 'Fonte fictícia com falha', 'Substituição fictícia', 1, 1);

INSERT INTO trifase_os_equipamentos (os_id, equipamento_id, tipo, marca, modelo, selo, serie, imei,
                                     itens_recebidos, estado_entrada, usuario_id, vinculado_em, operacao, payload_hash) VALUES
  (1, 1, 'Notebook', 'Marca Fictícia', 'Modelo Alfa', 'LAB-SELO-0001', 'LAB-SERIE-0001',
   '000000000000001', 'Notebook e carregador fictícios', 'Equipamento fictício com marcas de uso',
   1, '2026-11-01 09:00:00', 'lab-os-equip-0001', REPEAT('1', 64));

INSERT INTO os_historico (idHistorico, os_id, status_anterior, status_novo, usuarios_id, data_hora) VALUES
  (1, 1, NULL, 'Aberto', 1, '2026-11-01 09:00:00'),
  (2, 1, 'Aberto', 'Finalizado', 1, '2026-11-03 17:00:00');

INSERT INTO anotacoes_os (idAnotacoes, anotacao, data_hora, os_id) VALUES
  (1, 'Anotação fictícia de laboratório.', '2026-11-02 10:00:00', 1);

INSERT INTO garantias (idGarantias, dataGarantia, refGarantia, textoGarantia, usuarios_id) VALUES
  (1, '2026-11-03', 'LAB-GAR-0001', 'Garantia fictícia de 90 dias para laboratório.', 1);

UPDATE os SET garantias_id = 1 WHERE idOs = 1;

-- Estoque e custos fictícios da OS 1.
INSERT INTO trifase_estoque_eventos (id, produto_id, tipo, origem, quantidade, saldo_antes, saldo_depois,
                                     custo_unitario_c, data_movimento, motivo, usuario_id, criado_em,
                                     operacao, payload_hash, os_id, os_item_id) VALUES
  (1, 1, 'os_saida', 'Fixture de laboratório', -2, 10, 8, 5000, '2026-11-01',
   'Baixa fictícia para OS de laboratório.', 1, '2026-11-01 10:00:00',
   'lab-estoque-0001', REPEAT('2', 64), 1, 1);

INSERT INTO trifase_os_custos (id, os_id, item_id, tipo, quantidade, custo_unitario_c, descricao, origem,
                               usuario_id, criado_em, operacao, payload_hash) VALUES
  (1, 1, 1, 'produto', 2, 5000, 'Produto Fictício Alfa', 'Fixture de laboratório',
   1, '2026-11-01 10:00:00', 'lab-custo-os-0001', REPEAT('3', 64));

INSERT INTO trifase_servico_custos (id, servico_id, valor_c, motivo, anterior, usuario_id, criado_em, operacao, payload_hash) VALUES
  (1, 1, 2000, 'Custo fictício de laboratório.', 0, 1, '2026-10-30 09:00:00', 'lab-custo-servico-0001', REPEAT('4', 64));

-- Financeiro fictício da OS 1.
INSERT INTO lancamentos (idLancamentos, descricao, valor, desconto, valor_desconto, tipo_desconto,
                         data_vencimento, data_pagamento, baixado, cliente_fornecedor, forma_pgto, tipo, anexo,
                         observacoes, clientes_id, categorias_id, contas_id, usuarios_id, os_id) VALUES
  (1, 'Recebimento fictício da OS 1', 320.00, 0.00, 0.00, NULL, '2026-11-03', '2026-11-03', 1,
   'Cliente Fictício Alfa', 'Pix', 'receita', NULL, 'Lançamento fictício de laboratório.', 1, 1, 1, 1, 1);

UPDATE os SET lancamento = 1 WHERE idOs = 1;

INSERT INTO os_financeiro (os_id, total, vencimento, pendente_id, criado_em) VALUES
  (1, 320.00, '2026-11-03', 1, '2026-11-03 17:00:00');

INSERT INTO os_recebimentos (id, os_id, valor, data_recebimento, forma_pgto, lancamento_id, usuario_id,
                             criado_em, chave, estornado_em, estornado_por, motivo_estorno) VALUES
  (1, 1, 320.00, '2026-11-03', 'Pix', 1, 1, '2026-11-03 17:05:00', 'lab-recebimento-0001', NULL, NULL, NULL);

INSERT INTO trifase_financeiro_obrigacoes (os_id, bruto_c, desconto_c, vencimento, principal_id, usuario_id,
                                           garantia_inicio, origem) VALUES
  (1, 32000, 0, '2026-11-03', 1, 1, '2026-11-03', 'novo');

INSERT INTO trifase_financeiro_eventos (id, os_id, tipo, referencia_id, valor_c, desconto_c, data_evento, forma,
                                        lancamento_id, usuario_id, motivo, operacao, payload_hash, retificacao_cancelamento) VALUES
  (1, 1, 'receber', NULL, 32000, 0, '2026-11-03', 'Pix', 1, 1, NULL,
   'lab-financeiro-0001', REPEAT('5', 64), NULL);

INSERT INTO trifase_financeiro_projecoes (lancamento_id, os_id, ativo) VALUES
  (1, 1, 1);

-- Atendimento e entrega fictícios da OS 1.
INSERT INTO trifase_atendimentos (os_id, concluido_em, garantia_dias, usuario_id, registrado_em) VALUES
  (1, '2026-11-03', 90, 1, '2026-11-03 17:00:00');

INSERT INTO trifase_entregas_eventos (id, os_id, tipo, referencia_id, entregue_em, registrado_em, usuario_id,
                                      recebedor, terceiro, autorizacao, equipamento, itens, observacoes,
                                      confirmou_condicoes, motivo, operacao, payload_hash) VALUES
  (1, 1, 'registrar', NULL, '2026-11-03 00:00:00', '2026-11-03 17:10:00', 1,
   'Cliente Fictício Alfa', 0, 'Autorização fictícia de laboratório.', 'Notebook Fictício Modelo Alfa',
   'Notebook e carregador fictícios', 'Entrega fictícia de laboratório.', 1, NULL,
   'lab-entrega-0001', REPEAT('6', 64));

INSERT INTO trifase_entregas_estado (os_id, evento_id) VALUES
  (1, 1);

-- OS 2: retorno fictício em garantia da OS 1.
INSERT INTO os (idOs, dataInicial, dataFinal, garantia, descricaoProduto, defeito, status, observacoes,
                laudoTecnico, valorTotal, desconto, valor_desconto, tipo_desconto,
                clientes_id, usuarios_id, lancamento, faturado, garantias_id) VALUES
  (2, '2026-11-20', NULL, '0', 'Notebook Fictício Modelo Alfa (retorno)',
   'Retorno fictício em garantia', 'Aberto', 'Retorno criado exclusivamente para laboratório.',
   '', 0.00, 0.00, 0.00, NULL, 1, 1, NULL, 0, NULL);

INSERT INTO os_historico (idHistorico, os_id, status_anterior, status_novo, usuarios_id, data_hora) VALUES
  (3, 2, NULL, 'Aberto', 1, '2026-11-20 09:00:00');

INSERT INTO trifase_garantia_retornos (os_id, origem_id, anterior_id, equipamento_id, cliente_id,
                                       conclusao_origem, prazo_origem, vencimento_origem, usuario_id,
                                       criado_em, operacao, payload_hash) VALUES
  (2, 1, 1, 1, 1, '2026-11-03', 90, '2027-02-01', 1,
   '2026-11-20 09:00:00', 'lab-retorno-0001', REPEAT('7', 64));

INSERT INTO trifase_garantia_eventos (id, os_id, tipo, cobertura, diagnostico, solucao, motivo,
                                      valor_c, minutos, referencia_id, usuario_id, criado_em, operacao, payload_hash) VALUES
  (1, 2, 'avaliar', 'coberto', 'Diagnóstico fictício de garantia.', 'reparo_sem_cobranca',
   'Falha fictícia coberta pela garantia.', 0, 30, NULL, 1, '2026-11-21 10:00:00',
   'lab-garantia-aval-0001', REPEAT('8', 64));

INSERT INTO trifase_garantia_operacoes (id, os_id, origem_id, avaliacao_id, tipo, dados, usuario_id,
                                        criado_em, operacao, payload_hash) VALUES
  (1, 2, 1, 1, 'reparo_sem_cobranca', '{"solucao":"reparo_sem_cobranca"}', 1,
   '2026-11-21 10:05:00', 'lab-garantia-op-0001', REPEAT('9', 64));

COMMIT;
