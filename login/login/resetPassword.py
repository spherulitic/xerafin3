#!/usr/bin/python3

import json
import sys
import random
from email.message import EmailMessage
import smtplib
import bcrypt
import xerafinSetup3 as xs
import xerafinUtil3 as xu
import time

now = int(time.time())
params = json.load(sys.stdin)
print ("Content-type: application/json\n\n")
result = {"status": "success"}
debugLog = xu.debugLog("Reset Password")
mysqlcon = xs.getMysqlCon()
con = mysqlcon.cursor()
try:
  email = params["email"]
  debugLog.write("Email: {}".format(email))

  stmt = "select userid from user_auth where email = %s"
  con.execute(stmt, [email])
  qry = con.fetchone()
  debugLog.write("userid query results: {}\n".format(qry))
  if qry:
    uid = qry[0]
    debugLog.write("Updating for userid {}\n".format(uid))

    stmt = "select word from words where length(word) between 5 and 9 order by RAND() limit 1"
    plist = [ ]
    # password is three random words appended
    for x in range(3):
      con.execute(stmt)
      plist.append(con.fetchone()[0].capitalize())

    password = ''.join(plist)
    salt = bcrypt.gensalt(12)
    phash = bcrypt.hashpw(password, salt)

    debugLog.write("\nGenerated New Password\n")

    stmt = "update user_auth set password = %s where userid = %s"
    con.execute(stmt, [phash, uid])
    mysqlcon.commit()
    emailSubject = "Xerafin - Your New Password"
    message = "Your Xerafin password has been reset. It is now {}\n\n".format(password)

    debugLog.write("Creating email. . . \n")
    msg = EmailMessage()
    msg.set_content(message)
    msg['Subject'] = emailSubject
    msg['From'] = "donotreply@xerafin.net"
    msg['To'] = email

    debugLog.write("Sending email to {}\n".format(email))
    smtpObj = smtplib.SMTP("localhost")
    smtpObj.send_message(msg)
    smtpObj.quit()

    debugLog.write("Email sent\n")


  else:
    result["status"] = "Account Match Not Found"


except Exception as ex:
  xu.errorLog("Reset Password")
  result["status"] =  'An error occurred. See logs for more details.'

con.close()
mysqlcon.close()
debugLog.close()
print(json.dumps(result))
