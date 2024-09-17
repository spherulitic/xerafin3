
import json, sys, os
import xerafinSetup as xs
import datetime

'''
Given the dictionary, creates quizzes of high vowel words in each length
The output is to populate the quiz_master in the database (not containerized) and 
  the quiz JSON
'''
# Definition - how many vowels is "high vowel" for each length?
HIGH_VOWEL = {2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6, 11: 7, 12: 7, 13: 8, 14: 8, 15: 9}

def readFile(filename):
  ''' filename is a text file of words
      this returns a set of alphagrams
  '''
  with open(filename, 'r') as f:
     words = [line.strip() for line in f]
  return set([''.join(sorted(w)) for w in words])

def countVowels(word):
  return sum(1 for letter in word if letter in ['A', 'E', 'I', 'O', 'U'])

def createQuizzes():
  with xs.getMysqlCon() as con:
    cur = con.cursor()
    try:
      cur.execute("select max(quiz_id) from quiz_master") 
      quiz_id = int(cur.fetchone()[0]) + 1
    except:
      quiz_id = 0

    alphas = readFile('csw24_full.txt')
    hv_alphas = [a for a in alphas if countVowels(a) >= HIGH_VOWEL[len(a)]]
    for l in range(2,16):
      quiz_title = f'Vowel Heavy {l}s'
      quiz_owner = 0
      quiz_alphas = [a for a in hv_alphas if len(a) == l]
      quiz_size = len(quiz_alphas)
      quiz_json = { "name": quiz_title, "id": quiz_id, "size": len(alphas), "alphagrams": quiz_alphas }
      with open(f'json/{quiz_id}.json', 'w') as f:
        f.write(json.dumps(quiz_json))
              
        stmt = f'insert into quiz_master (quiz_id, quiz_name, quiz_size, creator, create_date, expired, quiz_type) values ({quiz_id}, "{quiz_title}", {quiz_size}, {quiz_owner}, CURDATE(), 0, 2)'

        cur.execute(stmt)    
        con.commit()
      quiz_id = quiz_id + 1 

createQuizzes()
