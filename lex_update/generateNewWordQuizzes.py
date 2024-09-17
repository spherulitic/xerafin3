
import json, sys, os
import xerafinSetup as xs
import datetime

'''
Takes in a file with new words. Creates one quiz with alphagrams per word length
The output is to populate the quiz_master in the database (not containerized) and 
  the quiz JSON
'''

def readFile(filename):
  ''' filename is a text file of words
      this returns a set of alphagrams
  '''
  with open(filename, 'r') as f:
     words = [line.strip() for line in f]
  return set([''.join(sorted(w)) for w in words])

def createNewQuizzes():
  with xs.getMysqlCon() as con:
    cur = con.cursor()
    try:
      cur.execute("select max(quiz_id) from quiz_master") 
      quiz_id = int(cur.fetchone()[0]) + 1
    except:
      quiz_id = 0

    alphas = readFile('csw24_additions.txt')
    for l in range(2,16):
      quiz_title = f'CSW24 New {l}s'
      quiz_owner = 0
      quiz_alphas = [a for a in alphas if len(a) == l]
      quiz_size = len(quiz_alphas)
      quiz_json = { "name": quiz_title, "id": quiz_id, "size": len(alphas), "alphagrams": quiz_alphas }
      with open(f'json/{quiz_id}.json', 'w') as f:
        f.write(json.dumps(quiz_json))
              
        stmt = f'insert into quiz_master (quiz_id, quiz_name, quiz_size, creator, create_date, expired, quiz_type) values ({quiz_id}, "{quiz_title}", {quiz_size}, {quiz_owner}, CURDATE(), 0, 2)'

        cur.execute(stmt)    
        con.commit()
      quiz_id = quiz_id + 1 

createNewQuizzes()
