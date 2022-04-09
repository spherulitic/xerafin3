#!/usr/bin/python3

import json
import sys
from http import cookies
import xerafinSetup3 as xs
import xerafinUtil3 as xu
import datetime
import os

result = { }
now = datetime.datetime.now()

# read the cookies. If we are sent a valid session ID, just say "successful" stop
try:
  sessionid = xu.getTokenFromCookies()
  userid = xu.getUseridFromToken(sessionid)


  if sessionid:
    mysqlcon = xs.getMysqlCon()
    con = mysqlcon.cursor()
    stmt = "update login set token = NULL where userid = %s and token = %s"
    con.execute(stmt, [userid, sessionid])
    mysqlcon.commit()
    con.close()
    mysqlcon.close()

    # browser deletes an expired cookie
    c = cookies.SimpleCookie()
    c["XSESSID"] = sessionid
    c["XSESSID"]["expires"] = now.strftime("%a, %d-%b-%Y %H:%M:%S EST")
    c["XSESSID"]["domain"] = "{}xerafin.net".format(xs.getDomain())
    c["XSESSID"]["path"] = "/"
    c["XSESSID"]["httponly"] = True
    c["XSESSID"]["secure"] = True
    #samesite not available until Python 3.7
    #c["XSESSID"]["samesite"] = True
    print(c)

except Exception as ex:
  xu.errorLog("Web Logout")
  result["status"] = "An error occurred. See log for details."

print ("Content-type: application/json\n")
print (json.dumps(result))
