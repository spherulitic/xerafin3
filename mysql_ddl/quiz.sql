-- MySQL dump 10.13  Distrib 8.0.31, for Linux (x86_64)
--
-- Host: localhost    Database: quiz
-- ------------------------------------------------------
-- Server version	8.0.31-0ubuntu0.22.04.1

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
  `creator` varchar(50) DEFAULT NULL,
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
-- Dumping data for table `quiz_master`
--

LOCK TABLES `quiz_master` WRITE;
/*!40000 ALTER TABLE `quiz_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `quiz_master` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `quiz_type_master`
--

LOCK TABLES `quiz_type_master` WRITE;
/*!40000 ALTER TABLE `quiz_type_master` DISABLE KEYS */;
INSERT INTO `quiz_type_master` VALUES (1,'Daily'),(2,'New'),(3,'Dead Sixes'),(4,'Weekly'),(5,'High Vowel'),(6,'Monthly'),(7,'Probability');
/*!40000 ALTER TABLE `quiz_type_master` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `quiz_user_detail`
--

LOCK TABLES `quiz_user_detail` WRITE;
/*!40000 ALTER TABLE `quiz_user_detail` DISABLE KEYS */;
/*!40000 ALTER TABLE `quiz_user_detail` ENABLE KEYS */;
UNLOCK TABLES;

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
  `frequency` varchar(20) DEFAULT NULL,
  `quiz_type` int DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `min_length` int DEFAULT NULL,
  `max_length` int DEFAULT NULL,
  PRIMARY KEY (`sub_id`),
  KEY `sub_master_quiz_type_fk` (`quiz_type`),
  CONSTRAINT `sub_master_ibfk_1` FOREIGN KEY (`quiz_type`) REFERENCES `quiz_type_master` (`quiz_type`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sub_master`
--

LOCK TABLES `sub_master` WRITE;
/*!40000 ALTER TABLE `sub_master` DISABLE KEYS */;
INSERT INTO `sub_master` VALUES (1,'Daily Quizzes','Daily 2s','Daily',1,50,2,2),(2,'Daily Quizzes','Daily 3s','Daily',1,50,3,3),(3,'Daily Quizzes','Daily 4s','Daily',1,50,4,4),(4,'Daily Quizzes','Daily 5s','Daily',1,50,5,5),(5,'Daily Quizzes','Daily 6s','Daily',1,50,6,6),(6,'Daily Quizzes','Daily 7s','Daily',1,50,7,7),(7,'Daily Quizzes','Daily 8s','Daily',1,50,8,8),(8,'Daily Quizzes','Daily 9s','Daily',1,50,9,9),(9,'Daily Quizzes','Daily 10s','Daily',1,50,10,10),(10,'Daily Quizzes','Daily 11s','Daily',1,50,11,11),(11,'Daily Quizzes','Daily 12s','Daily',1,50,12,12),(12,'Daily Quizzes','Daily 13s','Daily',1,50,13,13),(13,'Daily Quizzes','Daily 14s','Daily',1,50,14,14),(14,'Daily Quizzes','Daily 15s','Daily',1,50,15,15),(15,'Weekly Workout','Short Stuff','Weekly',4,200,3,4),(16,'Weekly Workout','Mid-Length Mayhem','Weekly',4,200,5,6),(17,'Weekly Workout','Bingo Bazaar','Weekly',4,200,7,8),(18,'Weekly Workout','Long List Legends','Weekly',4,200,9,10),(19,'Monthly Marathon','Short Circuits','Monthly',6,1000,4,6),(20,'Monthly Marathon','Bingo Bash','Monthly',6,1000,7,8),(21,'Monthly Marathon','Long Hots','Monthly',6,1000,9,10);
/*!40000 ALTER TABLE `sub_master` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `sub_user_xref`
--

LOCK TABLES `sub_user_xref` WRITE;
/*!40000 ALTER TABLE `sub_user_xref` DISABLE KEYS */;
/*!40000 ALTER TABLE `sub_user_xref` ENABLE KEYS */;
UNLOCK TABLES;

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

--
-- Dumping data for table `user_quiz_bookmark`
--

LOCK TABLES `user_quiz_bookmark` WRITE;
/*!40000 ALTER TABLE `user_quiz_bookmark` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_quiz_bookmark` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-01-29 20:36:06
