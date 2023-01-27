#!/usr/bin/python
import MySQLdb as mysql

def getMysqlCon(useUnicode=False):
   if useUnicode:
     return mysql.connect(host="localhost", user="xerafin", passwd="x3r4f1N)", db="xerafin", use_unicode=True)
   else:
     return mysql.connect(host="localhost", user="xerafin", passwd="x3r4f1N)", db="xerafin")

def getDomain():
  return ""
