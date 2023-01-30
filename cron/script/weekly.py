#!/usr/bin/python

import xerafinSetup as xs
import time
import os, sys
import math

now = int(time.time())
awards = [0, 1000, 100, 20, 8, 4];

try:

  with xs.getMysqlCon(True) as con:

    command = "insert into lb_summary(period, dateStamp, questionsAnswered, numUsers) select 'WEEK', min(dateStamp), sum(questionsAnswered), count(distinct userid) from leaderboard where YEARWEEK(dateStamp, 5) = YEARWEEK(curdate() - interval 1 day, 5) group by YEARWEEK(dateStamp, 5)"
    con.execute(command)


     # Weekly Awards
    command = "select count(distinct userid) from leaderboard where YEARWEEK(dateStamp, 5) = YEARWEEK(curdate() - interval 1 day, 5)"
    con.execute(command)
    row = con.fetchone()
    if row:
      users = row[0]
    else:
      users = 0
    command = "select userid, sum(questionsAnswered) from leaderboard where YEARWEEK(dateStamp, 5) = YEARWEEK(curdate() - interval 1 day, 5) group by userid order by sum(questionsAnswered) desc"
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
          command = 'insert into user_coin_log values (%s, curdate() - interval 1 day, %s, %s, %s, %s, %s)'
          con.execute(command, (row[0], 3, 'WEEK', 'QA', j, '{0}-{1}'.format(row[1], rank)))
          command = 'select count(*) from user_coin_total where userid = %s'
          con.execute(command, (row[0],))
          if con.fetchone()[0] == 0:
            command = 'insert into user_coin_total values (%s, 0, 0, 0, 0, 0, 0, 0, 0, curdate() - interval 1 day)'
            con.execute(command, (row[0],))
          # Weekly achievements get three coins
          command = 'update user_coin_total set {0} = {1} + 3 where userid = %s'.format(awardNames[j], awardNames[j])
          con.execute(command, (row[0],))
          break
        else:
          j += 1
      rank += 1
      if rank > awardRanks[-1]:
        break
  print "Weekly Awards Updated"

except Exception as ex:
  template = "An exception of type {0} occured. Arguments:\n{1!r}"
  message = template.format(type(ex).__name__, ex.args)
  print message
