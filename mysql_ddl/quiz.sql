-- MySQL dump 10.13  Distrib 8.0.30, for Linux (x86_64)
--
-- Host: localhost    Database: quiz
-- ------------------------------------------------------
-- Server version	8.0.30-0ubuntu0.22.04.1

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

--
-- Table structure for table `quiz_master`
--

DROP TABLE IF EXISTS `quiz_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_master` (
  `quiz_id` int NOT NULL,
  `quiz_name` varchar(100) DEFAULT NULL,
  `quiz_size` int DEFAULT NULL,
  `expired` int DEFAULT NULL,
  `creator` int DEFAULT NULL,
  `create_date` date DEFAULT NULL,
  `length` int DEFAULT NULL,
  `quiz_type` int DEFAULT NULL,
  `lexicon` varchar(4) DEFAULT NULL,
  `version` varchar(4) DEFAULT NULL,
  `sub_id` int DEFAULT NULL,
  `min_prob` int DEFAULT NULL,
  `max_prob` int DEFAULT NULL,
  PRIMARY KEY (`quiz_id`),
  KEY `fk_quiz_type` (`quiz_type`),
  CONSTRAINT `fk_quiz_type` FOREIGN KEY (`quiz_type`) REFERENCES `quiz_type_master` (`quiz_type`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quiz_type_master`
--

DROP TABLE IF EXISTS `quiz_type_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_type_master` (
  `quiz_type` int NOT NULL,
  `description` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`quiz_type`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quiz_user_detail`
--

DROP TABLE IF EXISTS `quiz_user_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_user_detail` (
  `quiz_id` int DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `alphagram` varchar(15) DEFAULT NULL,
  `correct` int DEFAULT NULL,
  `incorrect` int DEFAULT NULL,
  `last_answered` datetime DEFAULT NULL,
  `locked` int DEFAULT NULL,
  `completed` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `quiz_user_idx` (`quiz_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=939046 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sub_master`
--

DROP TABLE IF EXISTS `sub_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_master` (
  `sub_id` int NOT NULL AUTO_INCREMENT,
  `sub_group` varchar(50) DEFAULT NULL,
  `descr` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`sub_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sub_user_xref`
--

DROP TABLE IF EXISTS `sub_user_xref`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_user_xref` (
  `sub_id` int DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  KEY `sub_id` (`sub_id`),
  CONSTRAINT `sub_user_xref_ibfk_1` FOREIGN KEY (`sub_id`) REFERENCES `sub_master` (`sub_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_quiz_bookmark`
--

DROP TABLE IF EXISTS `user_quiz_bookmark`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_quiz_bookmark` (
  `quiz_id` int DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `create_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-01-23 20:50:08
