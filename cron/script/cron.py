#!/usr/bin/python

import xerafinSetup as xs
import time
import os, sys
import math

#print "Content-type: text/html\n\n"
#print "<html><head>"
#print "<title>Cron Test</title>"
#print "</head><body>"


now = int(time.time())

try:

  with xs.getMysqlCon(True) as con:
     con.execute("select count(*), sum(questionsAnswered) from leaderboard where dateStamp = curdate() - interval 1 day group by dateStamp")
     row = con.fetchone()
     users = row[0]
     questions = row[1]

     # Add daily summary to lb_summary
     command = "insert into lb_summary (period, dateStamp, questionsAnswered, numUsers) values (%s, CURDATE() - interval 1 day, %s, %s)"
     con.execute(command, ('DAY', questions, users))

     try:
       if time.strftime("%A") == "Monday":
         command = "insert into lb_summary(period, dateStamp, questionsAnswered, numUsers) select 'WEEK', min(dateStamp), sum(questionsAnswered), count(distinct userid) from leaderboard where DATE_FORMAT(dateStamp, '%Y%u') = DATE_FORMAT(curdate() - interval 1 day, '%Y%u') group by DATE_FORMAT(dateStamp, '%Y%u')"
         con.execute(command)
     except:
       pass

     try:
       if time.strftime("%d") == '01':
         command = "insert into lb_summary(period, dateStamp, questionsAnswered, numUsers) select 'MONTH', min(dateStamp), sum(questionsAnswered), count(distinct userid) from leaderboard where DATE_FORMAT(dateStamp, '%Y%m) = DATE_FORMAT(curdate() - interval 1 day, '%Y%m') group by DATE_FORMAT(dateStamp, '%Y%m')"
         con.execute(command)
     except:
       pass

     # Add Daily Summary chat to database

     userid = u'0'
     chatTime = now * 1000
     message = 'Good job Xerfers! Yesterday {0} users solved {1} alphagrams!'
     message = message.format(users, questions)
     command = "insert into chat (userid, timeStamp, message) values (%s, %s, %s)"

     con.execute(command, (userid.encode('utf8'), chatTime, message))

     # Push chat to active users
     AUTOLOGOFF = .1 # in hours
     logoffTime = now - (3600*AUTOLOGOFF)

     command = "select userid from login where last_active > %s"
     con.execute(command, logoffTime)
     for row in con.fetchall():
        filename = os.path.join('chats', row[0] + '.chat')
        with open(filename, 'a') as f:
            msg = unicode(userid)+u','+unicode(chatTime)+u','+unicode(message)+u'\n'
            f.write(msg.encode('utf8'))


     # Daily Awards
     command = 'select userid, questionsAnswered from leaderboard where dateStamp = curdate() - interval 1 day order by questionsAnswered desc'
     awards = [users, 1000, 100, 20, 8, 4];
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
           con.execute(command, (row[0], 1, 'DAY', 'QA', j, '{0}-{1}'.format(row[1], rank)))
           command = 'select count(*) from user_coin_total where userid = %s'
           con.execute(command, (row[0]))
           if con.fetchone()[0] == 0:
             command = 'insert into user_coin_total values (%s, 0, 0, 0, 0, 0, 0, 0, 0, curdate() - interval 1 day)'
             con.execute(command, (row[0]))
           command = 'update user_coin_total set {0} = {1} + 1 where userid = %s'.format(awardNames[j], awardNames[j])
           con.execute(command, (row[0]))
           break
         else:
            j += 1
       rank += 1
       if rank > awardRanks[-1]:
         break
#    con.execute("create table if not exists user_coin_log (userid varchar(50), dateStamp date, amount integer, period varchar(100), reason varchar(500), coinType integer, data varchar(500))")
     # Weekly Awards
     if time.strftime("%A") == "Monday":
       command = "select count(distinct userid) from leaderboard where DATE_FORMAT(dateStamp, '%Y%u') = DATE_FORMAT(curdate() - interval 1 day, '%Y%u')"
       con.execute(command)
       users = con.fetchone()[0]
       command = "select userid, sum(questionsAnswered) from leaderboard where DATE_FORMAT(dateStamp, '%Y%u') = DATE_FORMAT(curdate() - interval 1 day, '%Y%u') group by userid order by sum(questionsAnswered) desc"
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
             con.execute(command, (row[0]))
             if con.fetchone()[0] == 0:
               command = 'insert into user_coin_total values (%s, 0, 0, 0, 0, 0, 0, 0, 0, curdate() - interval 1 day)'
               con.execute(command, (row[0]))
             # Weekly achievements get three coins
             command = 'update user_coin_total set {0} = {1} + 3 where userid = %s'.format(awardNames[j], awardNames[j])
             con.execute(command, (row[0]))
             break
           else:
             j += 1
         rank += 1
         if rank > awardRanks[-1]:
           break
#  print "Hello, world!"
#  print "</body></html>"
except Exception as ex:
  template = "An exception of type {0} occured. Arguments:\n{1!r}"
  message = template.format(type(ex).__name__, ex.args)
  print message
