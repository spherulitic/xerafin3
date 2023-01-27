#!/usr/bin/python

import xerafinSetup as xs
import time
import os, sys
import math

now = int(time.time())
awards = [0, 1000, 100, 20, 8, 4];

try:

  with xs.getMysqlCon(True) as con:

    AWARD_AMT = 5
    command = "select count(distinct userid) from leaderboard where DATE_FORMAT(dateStamp, '%Y%m') = '201805'"
    con.execute(command)
    users = con.fetchone()[0]
    command = "select userid, sum(questionsAnswered) from leaderboard where DATE_FORMAT(dateStamp, '%Y%m') = '201805' group by userid order by sum(questionsAnswered) desc"
    awards[0] = users
    awardNames = ["emerald", "ruby", "sapphire", "gold", "silver", "bronze"]
    awardRanks = [math.ceil(float(users)/x) for x in awards]
    rank = 1
    con.execute(command)
    results = con.fetchall()
    for row in results:
      j = 0
      while j < len(awardRanks):
        if rank <= awardRanks[j]:
          command = 'insert into user_coin_log values (%s, "2018-05-31", %s, %s, %s, %s, %s)'
          con.execute(command, (row[0], AWARD_AMT, 'MONTH', 'QA', j, '{0}-{1}'.format(row[1], rank)))
          command = 'select count(*) from user_coin_total where userid = %s'
          con.execute(command, (row[0],))
          if con.fetchone()[0] == 0:
            command = 'insert into user_coin_total values (%s, 0, 0, 0, 0, 0, 0, 0, 0, "2018-05-31")'
            con.execute(command, (row[0],))
          command = 'update user_coin_total set {0} = {1} + {2} where userid = %s'.format(awardNames[j], awardNames[j], AWARD_AMT)
          con.execute(command, (row[0],))
          break
        else:
          j += 1
      rank += 1
      if rank > awardRanks[-1]:
        break

  print "Monthly cron complete"

except Exception as ex:
  template = "An exception of type {0} occured. Arguments:\n{1!r}"
  message = template.format(type(ex).__name__, ex.args)
  print message
