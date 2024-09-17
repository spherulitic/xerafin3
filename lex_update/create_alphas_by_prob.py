import string

''' This takes a word list and outputs a series of .txt files with alphagrams
 They are segretated by length and sorted by probability, broken up into files
   with 100 alphas each
'''

# Function to read words from a file into a set
def read_words(filename):
    with open(filename, 'r') as file:
        words = ({word.strip() for word in file})
    return words

# Function to initialize Scrabble tile counts (excluding blanks)
def initialize_scrabble_counts():
    return {
        'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
        'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
        'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
        'Y': 2, 'Z': 1
    }

# Function to calculate the combination count for a word
def calculate_probability(word):
    factorials = [1, 1, 2, 6, 24, 120, 620, 4340]
    # Initialize scrabble_counts for this calculation
    scrabble_counts = initialize_scrabble_counts()
    raw_prob = 1
    letter_counts = {}
    for letter in word:
      raw_prob = raw_prob * scrabble_counts[letter]
      scrabble_counts[letter] = scrabble_counts[letter] - 1
        
    # Count occurrences of each letter in the word
      if letter in letter_counts:
        letter_counts[letter] += 1
      else:
        letter_counts[letter] = 1
    
    for letter in letter_counts:
      raw_prob = raw_prob / factorials[letter_counts[letter]]

    return raw_prob

# Read words from the files
csw24 = read_words('csw24_full.txt')
csw24_alphas = set([''.join(sorted(w)) for w in csw24])
csw24_by_length = {length: ({a for a in csw24_alphas if len(a) == length}) for length in range(2,16)}

output = { }

for l in range(2,16):
  counts = [ ]
  for alpha in csw24_by_length[l]:
    counts.append((alpha, calculate_probability(alpha)))
  counts.sort(reverse=True, key=lambda x: x[1])
  for index, alpha in enumerate([x[0] for x in counts]):
    if index%100 == 0:
      file = open(f'prob/{l}_{index}.txt', 'w')
    file.write(f'{alpha}\n')
    if index%100 == 99:
      file.close()

