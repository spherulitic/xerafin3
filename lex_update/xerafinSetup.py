import MySQLdb as mysql
import os
from pymongo import MongoClient

def getMysqlCon():
  mysql_password = os.getenv("MYSQL_PWD")
  mysql_db = os.getenv("MYSQL_DB_QUIZ")
  mysql_user = os.getenv("MYSQL_USER")
  mysql_host = 'localhost'
  return mysql.connect(host=mysql_host, user=mysql_user, passwd=mysql_password, db=mysql_db, use_unicode=True)

def getMongoCon():
  mongo_user = os.environ.get('MONGO_INITDB_ROOT_USERNAME')
  mongo_pass = os.environ.get('MONGO_INITDB_ROOT_PASSWORD')
  mongo_db_name = os.environ.get('MONGO_INITDB_DATABASE')
  return MongoClient(f'mongodb://{mongo_user}:{mongo_pass}@localhost:27017/')

