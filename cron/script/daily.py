#!/usr/local/bin/python

from keycloak import KeycloakOpenID
import requests
import time
import os, sys
import math

now = int(time.time())
print(f"Hello world {now}")
KEYCLOAK_USER = os.environ.get("CRON_KUSER")
KEYCLOAK_PASS = os.environ.get("CRON_KPASS")
keycloak_openid = KeycloakOpenID(server_url="http://keycloak:8080/auth/",
                                 client_id="x-client",
                                 realm_name="Xerafin")

token = keycloak_openid.token(KEYCLOAK_USER, KEYCLOAK_PASS)
headers = {"Accept": "application/json", "Authorization": token['access_token']}

print("Logged into keycloak, testing token")
url = 'http://login:5000/'
resp = requests.post(url, headers=headers)
print(resp)


#
#try:
#
#  with xs.getMysqlCon(True) as con:
#     con.execute("select count(*), sum(questionsAnswered) from leaderboard where dateStamp = curdate() - interval 1 day group by dateStamp")
#     row = con.fetchone()
#     if row:
#       users = row[0]
#       questions = row[1]
#     else:
#       users = 0
#       questions = 0
#
#     # Add daily summary to lb_summary
#     command = "insert into lb_summary (period, dateStamp, questionsAnswered, numUsers) values (%s, CURDATE() - interval 1 day, %s, %s)"
#     con.execute(command, ('DAY', questions, users))
#
#
#     # Add Daily Summary chat to database
#
#     userid = u'0'
#     chatTime = now * 1000
#     message = 'Good job Xerfers! Yesterday {0} users solved {1} alphagrams!'
#     message = message.format(users, questions)
#     command = "insert into chat (userid, timeStamp, message) values (%s, %s, %s)"
#
#     con.execute(command, (userid.encode('utf8'), chatTime, message))
#
##     # Push chat to active users
#     AUTOLOGOFF = .1 # in hours
#     WEBPATH = "/var/www/html/xerafin"
#     logoffTime = now - (3600*AUTOLOGOFF)
#
#     command = "select userid from login where last_active > %s"
#     con.execute(command, (logoffTime,))
#     for row in con.fetchall():
#        filename = os.path.join(WEBPATH, 'chats', row[0] + '.chat')
#        with open(filename, 'a') as f:
#            msg = unicode(userid)+u','+unicode(chatTime)+u','+unicode(message)+u'\n'
#            f.write(msg.encode('utf8'))
#
#     print "Daily Chat Pushed"
#
#     # Daily Awards
#     command = 'select userid, questionsAnswered from leaderboard where dateStamp = curdate() - interval 1 day order by questionsAnswered desc'
#     awards = [users, 1000, 100, 20, 8, 4];
#     awardNames = ["emerald", "ruby", "sapphire", "gold", "silver", "bronze"]
#     awardRanks = [math.ceil(float(users)/x) for x in awards]
#     rank = 1
#     con.execute(command)
#     results = con.fetchall()
#     for row in results:
#       j = 0
#       while j < len(awardRanks):
#         if rank <= awardRanks[j]:
#           command = 'insert into user_coin_log values (%s, curdate() - interval 1 day, %s, %s, %s, %s, %s)'
#           con.execute(command, (row[0], 1, 'DAY', 'QA', j, '{0}-{1}'.format(row[1], rank)))
#           command = 'select count(*) from user_coin_total where userid = %s'
#           con.execute(command, (row[0],))
#           if con.fetchone()[0] == 0:
#             command = 'insert into user_coin_total values (%s, 0, 0, 0, 0, 0, 0, 0, 0, curdate() - interval 1 day)'
#             con.execute(command, (row[0],))
#           command = 'update user_coin_total set {0} = {1} + 1 where userid = %s'.format(awardNames[j], awardNames[j])
#           con.execute(command, (row[0],))
#           break
#         else:
#            j += 1
#       rank += 1
#       if rank > awardRanks[-1]:
#         break
#     print "Daily Awards Updated"
#except Exception as ex:
#  template = "An exception of type {0} occured. Arguments:\n{1!r}"
#  message = template.format(type(ex).__name__, ex.args)
#  print message
#
