#!/usr/bin/python

import json, sys, os
import xerafinSetup as xs
import datetime

try:

  with xs.getMysqlCon() as con:
    now = datetime.datetime.now()

    quizzes = [{"name": "New 4s", "where": "length(alphagram) = 4 and lexicon_symbols = '+' order by RAND()"},
               {"name": "New 5s", "where": "length(alphagram) = 5 and lexicon_symbols = '+' order by RAND()"},
               {"name": "New 6s", "where": "length(alphagram) = 6 and lexicon_symbols = '+' order by RAND()"},
               {"name": "New 7s", "where": "length(alphagram) = 7 and lexicon_symbols = '+' order by RAND()"},
               {"name": "New 8s", "where": "length(alphagram) = 8 and lexicon_symbols = '+' order by RAND()"},
               {"name": "New 9s", "where": "length(alphagram) = 9 and lexicon_symbols = '+' order by RAND()"}]
    # Hacky. 612 is the 6v9 quiz I made
#    con.execute("update quiz_master set expired = 1 where quiz_id != 612");
    for q in quizzes:
      try:
        con.execute("select max(quiz_id) from quiz_master")
        quizId = int(con.fetchone()[0]) + 1
      except:
        quizId = 0
      quizQuery = "select distinct alphagram from csw19 where {0}".format(q["where"])

      quizJSON = { "name": q["name"], "id": quizId }
      print str(quizJSON)
      con.execute(quizQuery)
      quizJSON["alphagrams"] = [ x[0] for x in con.fetchall() ]

      quizOwner = 0 # Xerafin user
      quizSize = len(quizJSON["alphagrams"])
      quizJSON["size"] = quizSize

      con.execute("insert into quiz_master (quiz_id, quiz_name, quiz_size, creator, create_date, expired) values (%s, %s, %s, %s, CURDATE(), 0)", (quizId, q["name"], quizSize, quizOwner))

      filename = os.path.join("/var/www/html/xerafin/quizJSON", "{0}.json".format(quizId))

      with open(filename, 'w') as f:
        f.write(json.dumps(quizJSON))

  print "Quizzes generated\n"

except Exception as ex:
  template = "An exception of type {0} occured. Arguments:\n{1!r}"
  message = template.format(type(ex).__name__, ex.args)
  print message
