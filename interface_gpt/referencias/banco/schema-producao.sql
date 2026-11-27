-- MapOS 5 Personalizado — estrutura instalada em producao (somente DDL).
-- Origem: pilha mapos-v5-trabalho, MySQL 8.4.11; nome do banco omitido.
-- Sanitizado: sem registros, sem AUTO_INCREMENT historico, sem comandos de
-- criacao/remocao de banco ou usuario, sem GRANT, sem rotinas/triggers/views
-- (inexistentes no banco).

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anexos` (
  `idAnexos` int NOT NULL AUTO_INCREMENT,
  `anexo` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `thumb` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `url` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `path` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `os_id` int NOT NULL,
  PRIMARY KEY (`idAnexos`),
  KEY `fk_anexos_os1` (`os_id`),
  CONSTRAINT `fk_anexos_os1` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anotacoes_os` (
  `idAnotacoes` int NOT NULL AUTO_INCREMENT,
  `anotacao` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `data_hora` datetime NOT NULL,
  `os_id` int NOT NULL,
  PRIMARY KEY (`idAnotacoes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_rate_limit` (
  `chave` char(64) NOT NULL,
  `janela` int unsigned NOT NULL,
  `total` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`chave`,`janela`),
  KEY `janela` (`janela`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_refresh_tokens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `familia` char(32) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `criado_em` datetime NOT NULL,
  `expira_em` datetime NOT NULL,
  `usado_em` datetime DEFAULT NULL,
  `revogado_em` datetime DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_refresh_tokens_hash` (`token_hash`),
  KEY `usuario_id` (`usuario_id`),
  KEY `familia` (`familia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `idCategorias` int NOT NULL AUTO_INCREMENT,
  `categoria` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cadastro` date DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `tipo` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`idCategorias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ci_sessions` (
  `id` varchar(128) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `timestamp` int unsigned NOT NULL DEFAULT '0',
  `data` blob NOT NULL,
  KEY `ci_sessions_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `idClientes` int NOT NULL AUTO_INCREMENT,
  `asaas_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `nomeCliente` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `sexo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pessoa_fisica` tinyint(1) NOT NULL DEFAULT '1',
  `documento` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `telefone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `celular` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `senha` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `dataCadastro` date DEFAULT NULL,
  `rua` varchar(70) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `numero` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bairro` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cidade` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `estado` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cep` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contato` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `complemento` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fornecedor` tinyint(1) NOT NULL DEFAULT '0',
  `token_versao` int unsigned DEFAULT '0',
  PRIMARY KEY (`idClientes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cobrancas` (
  `idCobranca` int NOT NULL AUTO_INCREMENT,
  `charge_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `conditional_discount_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `custom_id` int DEFAULT NULL,
  `expire_at` date NOT NULL,
  `message` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `payment_method` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `request_delivery_address` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `total` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `barcode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `payment_gateway` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `pdf` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vendas_id` int DEFAULT NULL,
  `os_id` int DEFAULT NULL,
  `clientes_id` int DEFAULT NULL,
  PRIMARY KEY (`idCobranca`),
  KEY `fk_cobrancas_os1` (`os_id`),
  KEY `fk_cobrancas_vendas1` (`vendas_id`),
  KEY `fk_cobrancas_clientes1` (`clientes_id`),
  CONSTRAINT `fk_cobrancas_clientes1` FOREIGN KEY (`clientes_id`) REFERENCES `clientes` (`idClientes`),
  CONSTRAINT `fk_cobrancas_os1` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`),
  CONSTRAINT `fk_cobrancas_vendas1` FOREIGN KEY (`vendas_id`) REFERENCES `vendas` (`idVendas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracoes` (
  `idConfig` int NOT NULL AUTO_INCREMENT,
  `config` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `valor` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`idConfig`),
  UNIQUE KEY `config` (`config`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contas` (
  `idContas` int NOT NULL AUTO_INCREMENT,
  `conta` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `banco` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `numero` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `saldo` decimal(10,2) DEFAULT NULL,
  `cadastro` date DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `tipo` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`idContas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentos` (
  `idDocumentos` int NOT NULL AUTO_INCREMENT,
  `documento` varchar(70) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `descricao` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `file` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `path` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `url` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cadastro` date DEFAULT NULL,
  `categoria` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tipo` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tamanho` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`idDocumentos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `to` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `cc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bcc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('pending','sending','sent','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `headers` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emitente` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cnpj` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ie` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rua` varchar(70) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `numero` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bairro` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cidade` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `uf` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `telefone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `url_logo` varchar(225) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cep` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipamentos` (
  `idEquipamentos` int NOT NULL AUTO_INCREMENT,
  `equipamento` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `num_serie` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `modelo` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cor` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `descricao` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tensao` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `potencia` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `voltagem` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `data_fabricacao` date DEFAULT NULL,
  `marcas_id` int DEFAULT NULL,
  `clientes_id` int DEFAULT NULL,
  PRIMARY KEY (`idEquipamentos`),
  KEY `fk_equipanentos_marcas1_idx` (`marcas_id`),
  KEY `fk_equipanentos_clientes1_idx` (`clientes_id`),
  CONSTRAINT `fk_equipanentos_clientes1` FOREIGN KEY (`clientes_id`) REFERENCES `clientes` (`idClientes`),
  CONSTRAINT `fk_equipanentos_marcas1` FOREIGN KEY (`marcas_id`) REFERENCES `marcas` (`idMarcas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipamentos_os` (
  `idEquipamentos_os` int NOT NULL AUTO_INCREMENT,
  `defeito_declarado` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `defeito_encontrado` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `solucao` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `equipamentos_id` int DEFAULT NULL,
  `os_id` int DEFAULT NULL,
  PRIMARY KEY (`idEquipamentos_os`),
  KEY `fk_equipamentos_os_equipanentos1_idx` (`equipamentos_id`),
  KEY `fk_equipamentos_os_os1_idx` (`os_id`),
  CONSTRAINT `fk_equipamentos_os_equipanentos1` FOREIGN KEY (`equipamentos_id`) REFERENCES `equipamentos` (`idEquipamentos`),
  CONSTRAINT `fk_equipamentos_os_os1` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `garantias` (
  `idGarantias` int NOT NULL AUTO_INCREMENT,
  `dataGarantia` date DEFAULT NULL,
  `refGarantia` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `textoGarantia` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `usuarios_id` int DEFAULT NULL,
  PRIMARY KEY (`idGarantias`),
  KEY `fk_garantias_usuarios1` (`usuarios_id`),
  CONSTRAINT `fk_garantias_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`idUsuarios`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `itens_de_vendas` (
  `idItens` int NOT NULL AUTO_INCREMENT,
  `subTotal` decimal(10,2) DEFAULT '0.00',
  `quantidade` int DEFAULT NULL,
  `preco` decimal(10,2) DEFAULT '0.00',
  `vendas_id` int NOT NULL,
  `produtos_id` int NOT NULL,
  `desconto` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tipo_desconto` varchar(8) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`idItens`),
  KEY `fk_itens_de_vendas_vendas1` (`vendas_id`),
  KEY `fk_itens_de_vendas_produtos1` (`produtos_id`),
  CONSTRAINT `fk_itens_de_vendas_produtos1` FOREIGN KEY (`produtos_id`) REFERENCES `produtos` (`idProdutos`),
  CONSTRAINT `fk_itens_de_vendas_vendas1` FOREIGN KEY (`vendas_id`) REFERENCES `vendas` (`idVendas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lancamentos` (
  `idLancamentos` int NOT NULL AUTO_INCREMENT,
  `descricao` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `valor` decimal(10,2) DEFAULT '0.00',
  `desconto` decimal(10,2) DEFAULT '0.00',
  `valor_desconto` decimal(10,2) DEFAULT '0.00',
  `tipo_desconto` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `data_vencimento` date NOT NULL,
  `data_pagamento` date DEFAULT NULL,
  `baixado` tinyint(1) DEFAULT '0',
  `cliente_fornecedor` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `forma_pgto` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tipo` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `anexo` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `observacoes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `clientes_id` int DEFAULT NULL,
  `categorias_id` int DEFAULT NULL,
  `contas_id` int DEFAULT NULL,
  `vendas_id` int DEFAULT NULL,
  `usuarios_id` int NOT NULL,
  `os_id` int DEFAULT NULL,
  PRIMARY KEY (`idLancamentos`),
  KEY `fk_lancamentos_clientes1` (`clientes_id`),
  KEY `fk_lancamentos_categorias1_idx` (`categorias_id`),
  KEY `fk_lancamentos_contas1_idx` (`contas_id`),
  KEY `fk_lancamentos_usuarios1` (`usuarios_id`),
  KEY `idx_lancamento_os` (`os_id`),
  CONSTRAINT `fk_lancamentos_categorias1` FOREIGN KEY (`categorias_id`) REFERENCES `categorias` (`idCategorias`),
  CONSTRAINT `fk_lancamentos_clientes1` FOREIGN KEY (`clientes_id`) REFERENCES `clientes` (`idClientes`),
  CONSTRAINT `fk_lancamentos_contas1` FOREIGN KEY (`contas_id`) REFERENCES `contas` (`idContas`),
  CONSTRAINT `fk_lancamentos_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`idUsuarios`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_attempts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `escopo` varchar(20) NOT NULL,
  `tipo` varchar(10) NOT NULL,
  `chave` char(64) NOT NULL,
  `falhas` int unsigned NOT NULL DEFAULT '0',
  `bloqueado_ate` datetime DEFAULT NULL,
  `ultima_falha` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `login_attempts_chave` (`escopo`,`tipo`,`chave`),
  KEY `ultima_falha` (`ultima_falha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs` (
  `idLogs` int NOT NULL AUTO_INCREMENT,
  `usuario` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tarefa` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `data` date DEFAULT NULL,
  `hora` time DEFAULT NULL,
  `ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`idLogs`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marcas` (
  `idMarcas` int NOT NULL AUTO_INCREMENT,
  `marca` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cadastro` date DEFAULT NULL,
  `situacao` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`idMarcas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `version` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `os` (
  `idOs` int NOT NULL AUTO_INCREMENT,
  `dataInicial` date DEFAULT NULL,
  `dataFinal` date DEFAULT NULL,
  `garantia` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `descricaoProduto` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `defeito` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `status` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `observacoes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `laudoTecnico` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `valorTotal` decimal(10,2) DEFAULT '0.00',
  `desconto` decimal(10,2) DEFAULT '0.00',
  `valor_desconto` decimal(10,2) DEFAULT '0.00',
  `tipo_desconto` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `clientes_id` int NOT NULL,
  `usuarios_id` int NOT NULL,
  `lancamento` int DEFAULT NULL,
  `faturado` tinyint(1) NOT NULL,
  `garantias_id` int DEFAULT NULL,
  PRIMARY KEY (`idOs`),
  KEY `fk_os_clientes1` (`clientes_id`),
  KEY `fk_os_usuarios1` (`usuarios_id`),
  KEY `fk_os_lancamentos1` (`lancamento`),
  KEY `fk_os_garantias1` (`garantias_id`),
  CONSTRAINT `fk_os_clientes1` FOREIGN KEY (`clientes_id`) REFERENCES `clientes` (`idClientes`),
  CONSTRAINT `fk_os_lancamentos1` FOREIGN KEY (`lancamento`) REFERENCES `lancamentos` (`idLancamentos`),
  CONSTRAINT `fk_os_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`idUsuarios`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_financeiro` (
  `os_id` int NOT NULL,
  `total` decimal(12,2) NOT NULL,
  `vencimento` date NOT NULL,
  `pendente_id` int DEFAULT NULL,
  `criado_em` datetime NOT NULL,
  PRIMARY KEY (`os_id`),
  CONSTRAINT `fk_os_financeiro_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_historico` (
  `idHistorico` int unsigned NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `status_anterior` varchar(45) DEFAULT NULL,
  `status_novo` varchar(45) NOT NULL,
  `usuarios_id` int DEFAULT NULL,
  `data_hora` datetime NOT NULL,
  PRIMARY KEY (`idHistorico`),
  KEY `os_id` (`os_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_recebimentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `valor` decimal(12,2) NOT NULL,
  `data_recebimento` date NOT NULL,
  `forma_pgto` varchar(45) NOT NULL,
  `lancamento_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  `chave` varchar(64) NOT NULL,
  `estornado_em` datetime DEFAULT NULL,
  `estornado_por` int DEFAULT NULL,
  `motivo_estorno` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recebimento_chave` (`chave`),
  KEY `idx_recebimento_os` (`os_id`),
  CONSTRAINT `fk_recebimentos_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_revisoes_orcamento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `motivo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `antes_json` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `depois_json` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `criado_em` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_os_revisoes_orcamento_os` (`os_id`),
  KEY `idx_os_revisoes_orcamento_usuario` (`usuario_id`),
  CONSTRAINT `fk_os_revisoes_orcamento_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_os_revisoes_orcamento_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `os_tokens_publicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `token` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `data_criacao` datetime NOT NULL,
  `data_expiracao` datetime NOT NULL,
  `revogado` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_token` (`token`),
  KEY `idx_os_id` (`os_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissoes` (
  `idPermissao` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `permissoes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `situacao` tinyint(1) DEFAULT NULL,
  `data` date DEFAULT NULL,
  `exigir_2fa` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`idPermissao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `produtos` (
  `idProdutos` int NOT NULL AUTO_INCREMENT,
  `codDeBarra` varchar(70) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `descricao` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `unidade` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `precoCompra` decimal(10,2) DEFAULT NULL,
  `precoVenda` decimal(10,2) NOT NULL,
  `estoque` int NOT NULL,
  `estoqueMinimo` int DEFAULT NULL,
  `saida` tinyint(1) DEFAULT NULL,
  `entrada` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`idProdutos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `produtos_os` (
  `idProdutos_os` int NOT NULL AUTO_INCREMENT,
  `quantidade` int NOT NULL,
  `descricao` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `preco` decimal(10,2) DEFAULT '0.00',
  `os_id` int NOT NULL,
  `produtos_id` int NOT NULL,
  `subTotal` decimal(10,2) DEFAULT '0.00',
  `desconto` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tipo_desconto` varchar(8) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`idProdutos_os`),
  KEY `fk_produtos_os_os1` (`os_id`),
  KEY `fk_produtos_os_produtos1` (`produtos_id`),
  CONSTRAINT `fk_produtos_os_os1` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`),
  CONSTRAINT `fk_produtos_os_produtos1` FOREIGN KEY (`produtos_id`) REFERENCES `produtos` (`idProdutos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resets_de_senha` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `data_expiracao` datetime NOT NULL,
  `token_utilizado` tinyint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicos` (
  `idServicos` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `descricao` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `preco` decimal(10,2) NOT NULL,
  PRIMARY KEY (`idServicos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicos_os` (
  `idServicos_os` int NOT NULL AUTO_INCREMENT,
  `servico` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quantidade` double DEFAULT NULL,
  `preco` decimal(10,2) DEFAULT '0.00',
  `os_id` int NOT NULL,
  `servicos_id` int NOT NULL,
  `subTotal` decimal(10,2) DEFAULT '0.00',
  `desconto` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tipo_desconto` varchar(8) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`idServicos_os`),
  KEY `fk_servicos_os_os1` (`os_id`),
  KEY `fk_servicos_os_servicos1` (`servicos_id`),
  CONSTRAINT `fk_servicos_os_os1` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`),
  CONSTRAINT `fk_servicos_os_servicos1` FOREIGN KEY (`servicos_id`) REFERENCES `servicos` (`idServicos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_atendimentos` (
  `os_id` int NOT NULL,
  `concluido_em` date NOT NULL,
  `garantia_dias` int NOT NULL,
  `usuario_id` int NOT NULL,
  `registrado_em` datetime NOT NULL,
  PRIMARY KEY (`os_id`),
  CONSTRAINT `tf_atend_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_cadastros_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo` varchar(24) NOT NULL,
  `recurso_id` int NOT NULL,
  `antes` text NOT NULL,
  `depois` text NOT NULL,
  `motivo` text NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  KEY `tipo_recurso_id` (`tipo`,`recurso_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_cancelamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `tipo` varchar(16) NOT NULL,
  `pedido_id` int DEFAULT NULL,
  `solicitante` varchar(160) NOT NULL,
  `motivo` text NOT NULL,
  `retrato` text NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  KEY `os_id` (`os_id`),
  CONSTRAINT `tf_cancelamento_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_entregas_estado` (
  `os_id` int NOT NULL,
  `evento_id` int NOT NULL,
  PRIMARY KEY (`os_id`),
  UNIQUE KEY `evento_id` (`evento_id`),
  CONSTRAINT `tf_ent_est_ev` FOREIGN KEY (`evento_id`) REFERENCES `trifase_entregas_eventos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_ent_est_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_entregas_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `tipo` varchar(16) NOT NULL,
  `referencia_id` int DEFAULT NULL,
  `entregue_em` datetime DEFAULT NULL,
  `registrado_em` datetime NOT NULL,
  `usuario_id` int NOT NULL,
  `recebedor` varchar(150) DEFAULT NULL,
  `terceiro` int NOT NULL DEFAULT '0',
  `autorizacao` varchar(500) DEFAULT NULL,
  `equipamento` text,
  `itens` text,
  `observacoes` text,
  `confirmou_condicoes` int NOT NULL DEFAULT '0',
  `motivo` varchar(500) DEFAULT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  UNIQUE KEY `referencia_id` (`referencia_id`),
  KEY `tf_ent_os` (`os_id`),
  CONSTRAINT `tf_ent_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_ent_ref` FOREIGN KEY (`referencia_id`) REFERENCES `trifase_entregas_eventos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_equipamento_correcoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `antes` longtext NOT NULL,
  `depois` longtext NOT NULL,
  `motivo` text NOT NULL,
  `criado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  KEY `os_id` (`os_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_equipamento_modelos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo` varchar(24) NOT NULL,
  `marca` varchar(100) NOT NULL,
  `modelo` varchar(160) NOT NULL,
  `chave` char(64) NOT NULL,
  `usuario_id` int NOT NULL,
  `atualizado_em` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chave` (`chave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_equipamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `modelo_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `selo` varchar(100) NOT NULL,
  `selo_chave` char(64) DEFAULT NULL,
  `serie` varchar(100) NOT NULL,
  `imei` varchar(100) NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `selo_chave` (`selo_chave`),
  KEY `tf_eq_modelo` (`modelo_id`),
  KEY `tf_eq_cliente` (`cliente_id`),
  CONSTRAINT `tf_eq_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`idClientes`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_eq_modelo` FOREIGN KEY (`modelo_id`) REFERENCES `trifase_equipamento_modelos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_estoque_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `produto_id` int NOT NULL,
  `tipo` varchar(32) NOT NULL,
  `origem` varchar(100) NOT NULL,
  `quantidade` int NOT NULL,
  `saldo_antes` int NOT NULL,
  `saldo_depois` int NOT NULL,
  `custo_unitario_c` bigint DEFAULT NULL,
  `data_movimento` date NOT NULL,
  `motivo` text NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  `os_id` int DEFAULT NULL,
  `os_item_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  KEY `tf_est_prod` (`produto_id`),
  KEY `tf_est_linha_os` (`os_id`,`os_item_id`,`produto_id`,`tipo`),
  CONSTRAINT `tf_est_prod` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`idProdutos`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_financeiro_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `tipo` varchar(16) NOT NULL,
  `referencia_id` int DEFAULT NULL,
  `valor_c` int NOT NULL,
  `desconto_c` int NOT NULL,
  `data_evento` date NOT NULL,
  `forma` varchar(64) NOT NULL,
  `lancamento_id` int DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `motivo` varchar(500) DEFAULT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  `retificacao_cancelamento` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  UNIQUE KEY `referencia_id` (`referencia_id`),
  UNIQUE KEY `lancamento_id` (`lancamento_id`),
  KEY `tf_ev_os` (`os_id`),
  CONSTRAINT `tf_ev_lan` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos` (`idLancamentos`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_ev_os` FOREIGN KEY (`os_id`) REFERENCES `trifase_financeiro_obrigacoes` (`os_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_ev_ref` FOREIGN KEY (`referencia_id`) REFERENCES `trifase_financeiro_eventos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_financeiro_obrigacoes` (
  `os_id` int NOT NULL,
  `bruto_c` int NOT NULL,
  `desconto_c` int NOT NULL,
  `vencimento` date NOT NULL,
  `principal_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `garantia_inicio` date DEFAULT NULL,
  `origem` varchar(16) DEFAULT 'novo',
  PRIMARY KEY (`os_id`),
  UNIQUE KEY `principal_id` (`principal_id`),
  CONSTRAINT `tf_ob_lan` FOREIGN KEY (`principal_id`) REFERENCES `lancamentos` (`idLancamentos`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_ob_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_financeiro_projecoes` (
  `lancamento_id` int NOT NULL,
  `os_id` int NOT NULL,
  `ativo` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`lancamento_id`),
  KEY `tf_pr_os` (`os_id`),
  CONSTRAINT `tf_pr_lan` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos` (`idLancamentos`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_pr_os` FOREIGN KEY (`os_id`) REFERENCES `trifase_financeiro_obrigacoes` (`os_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_garantia_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `tipo` varchar(20) NOT NULL,
  `cobertura` varchar(20) NOT NULL,
  `diagnostico` text NOT NULL,
  `solucao` varchar(24) NOT NULL,
  `motivo` text NOT NULL,
  `valor_c` bigint NOT NULL DEFAULT '0',
  `minutos` int NOT NULL DEFAULT '0',
  `referencia_id` int DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  UNIQUE KEY `referencia_id` (`referencia_id`),
  KEY `tf_ret_evt_os` (`os_id`),
  CONSTRAINT `tf_ret_evt_os` FOREIGN KEY (`os_id`) REFERENCES `trifase_garantia_retornos` (`os_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_ret_evt_ref` FOREIGN KEY (`referencia_id`) REFERENCES `trifase_garantia_eventos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_garantia_operacoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `origem_id` int NOT NULL,
  `avaliacao_id` int NOT NULL,
  `tipo` varchar(32) NOT NULL,
  `dados` text NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  KEY `os_id` (`os_id`),
  KEY `origem_id` (`origem_id`),
  KEY `tf_gop_av` (`avaliacao_id`),
  CONSTRAINT `tf_gop_av` FOREIGN KEY (`avaliacao_id`) REFERENCES `trifase_garantia_eventos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_gop_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_gop_raiz` FOREIGN KEY (`origem_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_garantia_reembolsos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `origem_id` int NOT NULL,
  `evento_id` int NOT NULL,
  `valor_c` int NOT NULL,
  `credito_c` int NOT NULL,
  `modo` varchar(16) NOT NULL,
  `data_evento` date NOT NULL,
  `forma` varchar(64) NOT NULL,
  `referencia` varchar(300) NOT NULL,
  `motivo` text NOT NULL,
  `despesa_id` int NOT NULL,
  `cancelado_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `evento_id` (`evento_id`),
  UNIQUE KEY `despesa_id` (`despesa_id`),
  UNIQUE KEY `cancelado_id` (`cancelado_id`),
  KEY `os_id` (`os_id`),
  KEY `origem_id` (`origem_id`),
  CONSTRAINT `tf_gr_cancel` FOREIGN KEY (`cancelado_id`) REFERENCES `trifase_garantia_operacoes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_gr_despesa` FOREIGN KEY (`despesa_id`) REFERENCES `lancamentos` (`idLancamentos`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_gr_evento` FOREIGN KEY (`evento_id`) REFERENCES `trifase_garantia_operacoes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_gr_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_garantia_retornos` (
  `os_id` int NOT NULL,
  `origem_id` int NOT NULL,
  `anterior_id` int NOT NULL,
  `equipamento_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `conclusao_origem` date NOT NULL,
  `prazo_origem` int NOT NULL,
  `vencimento_origem` date DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`os_id`),
  UNIQUE KEY `operacao` (`operacao`),
  KEY `tf_ret_origem` (`origem_id`),
  KEY `tf_ret_anterior` (`anterior_id`),
  KEY `tf_ret_unidade` (`equipamento_id`),
  CONSTRAINT `tf_ret_anterior` FOREIGN KEY (`anterior_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_ret_origem` FOREIGN KEY (`origem_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_ret_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_ret_unidade` FOREIGN KEY (`equipamento_id`) REFERENCES `trifase_equipamentos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_garantia_trocas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `origem_id` int NOT NULL,
  `evento_id` int NOT NULL,
  `antiga_id` int NOT NULL,
  `nova_id` int NOT NULL,
  `produto_id` int DEFAULT NULL,
  `identificacao` text NOT NULL,
  `destino_antiga` varchar(32) NOT NULL,
  `custo_c` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `os_id` (`os_id`),
  UNIQUE KEY `evento_id` (`evento_id`),
  UNIQUE KEY `antiga_id` (`antiga_id`),
  UNIQUE KEY `nova_id` (`nova_id`),
  KEY `origem_id` (`origem_id`),
  KEY `tf_gt_prod` (`produto_id`),
  CONSTRAINT `tf_gt_antiga` FOREIGN KEY (`antiga_id`) REFERENCES `trifase_equipamentos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_gt_evento` FOREIGN KEY (`evento_id`) REFERENCES `trifase_garantia_operacoes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_gt_nova` FOREIGN KEY (`nova_id`) REFERENCES `trifase_equipamentos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_gt_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_gt_prod` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`idProdutos`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_orcamento_estado` (
  `os_id` int NOT NULL,
  `versao_id` int NOT NULL,
  `ativo` int NOT NULL,
  PRIMARY KEY (`os_id`),
  KEY `tf_orc_est_ver` (`versao_id`),
  CONSTRAINT `tf_orc_est_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_orc_est_ver` FOREIGN KEY (`versao_id`) REFERENCES `trifase_orcamento_versoes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_orcamento_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `versao_id` int NOT NULL,
  `tipo` varchar(16) NOT NULL,
  `nome` varchar(160) NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `criado_em` datetime NOT NULL,
  `decisao_versao` int DEFAULT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  `canal` varchar(16) DEFAULT NULL,
  `comunicado_em` datetime DEFAULT NULL,
  `observacao` text,
  `regularizacao_tardia` int NOT NULL DEFAULT '0',
  `justificativa` text,
  `entrega_id` int DEFAULT NULL,
  `comunicado_data` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  UNIQUE KEY `decisao_versao` (`decisao_versao`),
  KEY `tf_orc_evt_os` (`os_id`),
  KEY `tf_orc_evt_ver` (`versao_id`),
  KEY `tf_orc_entrega_idx` (`entrega_id`),
  CONSTRAINT `tf_orc_entrega` FOREIGN KEY (`entrega_id`) REFERENCES `trifase_entregas_eventos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_orc_evt_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_orc_evt_ver` FOREIGN KEY (`versao_id`) REFERENCES `trifase_orcamento_versoes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_orcamento_versoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `numero` int NOT NULL,
  `conteudo` text NOT NULL,
  `conteudo_hash` char(64) NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tf_orc_os` (`os_id`),
  CONSTRAINT `tf_orc_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_os_custos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `os_id` int NOT NULL,
  `item_id` int NOT NULL,
  `tipo` varchar(16) NOT NULL,
  `quantidade` int NOT NULL,
  `custo_unitario_c` bigint DEFAULT NULL,
  `descricao` text NOT NULL,
  `origem` varchar(100) NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  KEY `tf_custo_os` (`os_id`),
  CONSTRAINT `tf_custo_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_os_equipamentos` (
  `os_id` int NOT NULL,
  `equipamento_id` int NOT NULL,
  `tipo` varchar(24) NOT NULL,
  `marca` varchar(100) NOT NULL,
  `modelo` varchar(160) NOT NULL,
  `selo` varchar(100) NOT NULL,
  `serie` varchar(100) NOT NULL,
  `imei` varchar(100) NOT NULL,
  `itens_recebidos` text NOT NULL,
  `estado_entrada` text NOT NULL,
  `usuario_id` int NOT NULL,
  `vinculado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`os_id`),
  UNIQUE KEY `operacao` (`operacao`),
  KEY `tf_eq_unidade` (`equipamento_id`),
  CONSTRAINT `tf_eq_os` FOREIGN KEY (`os_id`) REFERENCES `os` (`idOs`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tf_eq_unidade` FOREIGN KEY (`equipamento_id`) REFERENCES `trifase_equipamentos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_publico_anexos` (
  `os_id` int NOT NULL,
  `anexo_id` int NOT NULL,
  PRIMARY KEY (`os_id`,`anexo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_publico_links` (
  `os_id` int NOT NULL,
  `token_hash` varchar(64) DEFAULT NULL,
  `expira_em` bigint DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `token_cifrado` text,
  `validade_dias` int DEFAULT '30',
  PRIMARY KEY (`os_id`),
  KEY `token_hash` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trifase_servico_custos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `servico_id` int NOT NULL,
  `valor_c` bigint NOT NULL,
  `motivo` text NOT NULL,
  `anterior` int NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime NOT NULL,
  `operacao` varchar(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacao` (`operacao`),
  KEY `tf_custo_servico` (`servico_id`),
  CONSTRAINT `tf_custo_servico` FOREIGN KEY (`servico_id`) REFERENCES `servicos` (`idServicos`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `idUsuarios` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `rg` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cpf` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `cep` varchar(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `rua` varchar(70) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `numero` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bairro` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cidade` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `estado` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `senha` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `telefone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `celular` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `situacao` tinyint(1) NOT NULL,
  `dataCadastro` date NOT NULL,
  `permissoes_id` int NOT NULL,
  `dataExpiracao` date DEFAULT NULL,
  `url_image_user` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `totp_secreto` text COLLATE utf8mb4_general_ci,
  `totp_ativado_em` datetime DEFAULT NULL,
  `totp_ultimo_passo` bigint unsigned DEFAULT NULL,
  `tema_modo` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `token_versao` int unsigned DEFAULT '0',
  `sessao_versao` int unsigned DEFAULT '0',
  `tema_cor` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`idUsuarios`),
  KEY `fk_usuarios_permissoes1_idx` (`permissoes_id`),
  CONSTRAINT `fk_usuarios_permissoes1` FOREIGN KEY (`permissoes_id`) REFERENCES `permissoes` (`idPermissao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios_codigos_recuperacao` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `codigo_hash` char(64) NOT NULL,
  `criado_em` datetime NOT NULL,
  `usado_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuarios_codigos_hash` (`codigo_hash`),
  KEY `usuario_id` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendas` (
  `idVendas` int NOT NULL AUTO_INCREMENT,
  `dataVenda` date DEFAULT NULL,
  `valorTotal` decimal(10,2) DEFAULT '0.00',
  `desconto` decimal(10,2) DEFAULT '0.00',
  `valor_desconto` decimal(10,2) DEFAULT '0.00',
  `tipo_desconto` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `faturado` tinyint(1) DEFAULT NULL,
  `observacoes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `observacoes_cliente` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `clientes_id` int NOT NULL,
  `usuarios_id` int DEFAULT NULL,
  `lancamentos_id` int DEFAULT NULL,
  `status` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `garantia` int DEFAULT NULL,
  PRIMARY KEY (`idVendas`),
  KEY `fk_vendas_clientes1` (`clientes_id`),
  KEY `fk_vendas_usuarios1` (`usuarios_id`),
  KEY `fk_vendas_lancamentos1` (`lancamentos_id`),
  CONSTRAINT `fk_vendas_clientes1` FOREIGN KEY (`clientes_id`) REFERENCES `clientes` (`idClientes`),
  CONSTRAINT `fk_vendas_lancamentos1` FOREIGN KEY (`lancamentos_id`) REFERENCES `lancamentos` (`idLancamentos`),
  CONSTRAINT `fk_vendas_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`idUsuarios`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
