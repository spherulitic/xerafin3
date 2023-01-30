#!/usr/bin/python

import json, sys, os
import xerafinSetup as xs
import datetime

DOMAIN = 'xerafin'
DAILY_QUIZ_TYPE = 1

try:

  with xs.getMysqlCon() as con:
    now = datetime.datetime.now()

    quizzes = [{"length": 2, "sub": 1, "name": "Daily 2s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 2 order by RAND() limit 50"},
    {"length": 3, "sub": 2, "name": "Daily 3s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 3 order by RAND() limit 50"},
    {"length": 4, "sub": 3, "name": "Daily 4s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 4 order by RAND() limit 50"},
    {"length": 5, "sub": 4, "name": "Daily 5s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 5 order by RAND() limit 50"},
    {"length": 6, "sub": 5, "name": "Daily 6s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 6 order by RAND() limit 50"},
    {"length": 7, "sub": 6, "name": "Daily 7s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 7 order by RAND() limit 50"},
    {"length": 8, "sub": 7, "name": "Daily 8s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 8 order by RAND() limit 50"},
    {"length": 9, "sub": 8, "name": "Daily 9s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 9 order by RAND() limit 50"},
    {"length": 10, "sub": 9, "name": "Daily 10s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 10 order by RAND() limit 50"},
    {"length": 11, "sub": 10, "name": "Daily 11s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 11 order by RAND() limit 50"},
    {"length": 12, "sub": 11, "name": "Daily 12s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 12 order by RAND() limit 50"},
    {"length": 13, "sub": 12, "name": "Daily 13s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 13 order by RAND() limit 50"},
    {"length": 14, "sub": 13, "name": "Daily 14s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 14 order by RAND() limit 50"},
    {"length": 15, "sub": 14, "name": "Daily 15s {0}".format(now.strftime("%d %b %Y")), "where": "length(alphagram) = 15 order by RAND() limit 50"}]

    stmt = "update quiz_master set sub_id = null where quiz_type = %s"
    con.execute(stmt, [DAILY_QUIZ_TYPE])

    for q in quizzes:
      try:
        con.execute("select max(quiz_id) from quiz_master")
        quizId = int(con.fetchone()[0]) + 1
      except:
        quizId = 0
      quizQuery = "select distinct alphagram from csw21 where {0}".format(q["where"])

      quizJSON = { "name": q["name"], "id": quizId }
      con.execute(quizQuery)
      quizJSON["alphagrams"] = [ x[0] for x in con.fetchall() ]

      quizOwner = 0 # Xerafin user
      quizSize = len(quizJSON["alphagrams"])
      quizJSON["size"] = quizSize

      con.execute("insert into quiz_master (quiz_id, quiz_name, quiz_size, sub_id, creator, create_date, quiz_type, length, lexicon, version) values (%s, %s, %s, %s, %s, CURDATE(), %s, %s, 'CSW', '21')", (quizId, q["name"], quizSize, q["sub"], quizOwner,DAILY_QUIZ_TYPE, q["length"]))

      filename = os.path.join("/var/www/html/{}/quizJSON".format(DOMAIN), "{}.json".format(quizId))

      with open(filename, 'w') as f:
        f.write(json.dumps(quizJSON))

  print "Daily Quizzes generated\n"

except Exception as ex:
  template = "An exception of type {0} occured. Arguments:\n{1!r}"
  message = template.format(type(ex).__name__, ex.args)
  print message
