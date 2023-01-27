#!/usr/bin/python

import json, sys, os
import xerafinSetup as xs
import xerafinUtil as xu
import datetime

DOMAIN = 'xerafin'
MONTHLY_QUIZ_TYPE = 6

try:

  with xs.getMysqlCon() as con:
    now = datetime.datetime.now()

    quizzes = [{"sub": 19, "name": "Short Circuits {}".format(now.strftime("%b %Y")), "where": "length(alphagram) in (4,5,6) order by RAND() limit 1000"},
               {"sub": 20, "name": "Bingo Bash {}".format(now.strftime("%b %Y")), "where": "length(alphagram) in (7,8) order by RAND() limit 1000"},
               {"sub": 21, "name": "Long Hots {}".format(now.strftime("%b %Y")), "where": "length(alphagram) in (9,10) order by RAND() limit 1000"}]
    stmt = "update quiz_master set sub_id = null where quiz_type = %s"
    con.execute(stmt, [MONTHLY_QUIZ_TYPE])
    for q in quizzes:
      try:
        con.execute("select max(quiz_id) from quiz_master")
        quizId = int(con.fetchone()[0]) + 1
      except:
        quizId = 0
      quizQuery = "select distinct alphagram from csw19 where {0}".format(q["where"])

      quizJSON = { "name": q["name"], "id": quizId }
      con.execute(quizQuery)
      quizJSON["alphagrams"] = [ x[0] for x in con.fetchall() ]

      quizOwner = 0 # Xerafin user
      quizSize = len(quizJSON["alphagrams"])
      quizJSON["size"] = quizSize

      stmt = "insert into quiz_master (quiz_id, quiz_name, quiz_size, quiz_type, sub_id, creator, create_date, lexicon, version) values (%s, %s, %s, %s, %s, %s, CURDATE(), 'CSW', '19')"
      con.execute(stmt, [quizId, q["name"], quizSize, MONTHLY_QUIZ_TYPE, q["sub"], quizOwner])

      filename = os.path.join("/var/www/html/{}/quizJSON".format(DOMAIN), "{0}.json".format(quizId))

      with open(filename, 'w') as f:
        f.write(json.dumps(quizJSON))

  print "Monthly Quizzes generated\n"

except Exception as ex:
  xu.error(__file__)
