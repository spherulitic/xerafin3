
import json, sys, os
import xerafinSetup as xs
import datetime

'''
This takes .txt files in a directory, currently with a naming convention:
length_start.txt where start is the lowest probability alpahgram in the list.
This is the output of create_alphas_by_prob.py
This could also be modified to create other canned quizzes, given text files of, say,
 five-vowel eights in alphagram form.
The output is to populate the quiz_master in the database (not containerized) and 
  the quiz JSON
'''

def readFile(filename):
  with open(filename, 'r') as f:
    return [line.strip() for line in f]

def createProbabilityQuizzes():
  data_dir = 'prob'
  with xs.getMysqlCon() as con:
    cur = con.cursor()
    try:
      cur.execute("select max(quiz_id) from quiz_master") 
      quiz_id = int(cur.fetchone()[0]) + 1
    except:
      quiz_id = 0

    for filename in os.listdir(data_dir):
      if filename.endswith(".txt"):
        base_name = filename.split('.')[0] # delete the .txt
        length, start = base_name.split('_') # files are named 10_100.txt etc
        length = int(length)
        start = int(start)
  
        alphas = readFile(f'{data_dir}/{filename}')
        end = start + len(alphas) - 1
        quiz_title = f'{length}s by Probability {start} - {end}'
  
        quiz_owner = 0
        quiz_size = len(alphas)
        quiz_json = { "name": quiz_title, "id": quiz_id, "size": len(alphas), "alphagrams": alphas }
        with open(f'json/{quiz_id}.json', 'w') as f:
          f.write(json.dumps(quiz_json))
              
        stmt = f'insert into quiz_master (quiz_id, quiz_name, quiz_size, creator, create_date, expired, quiz_type, min_prob, max_prob) values ({quiz_id}, "{quiz_title}", {quiz_size}, {quiz_owner}, CURDATE(), 0, 7, {start}, {end})'

        cur.execute(stmt)    
        quiz_id = quiz_id + 1 
        con.commit()

createProbabilityQuizzes()
