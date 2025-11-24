import csv
import os
from pymongo import MongoClient
import sys

def calculate_front_hooks(word, words_set):
    hooks = []
    for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        candidate = letter + word
        if candidate in words_set:
            hooks.append(letter)
    return ''.join(hooks).lower()

def calculate_back_hooks(word, words_set):
    hooks = []
    for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        candidate = word + letter
        if candidate in words_set:
            hooks.append(letter)
    return ''.join(hooks).lower()

def load_words():
    print("Starting word data load...")


    # Get MongoDB credentials from environment
    mongo_host = os.getenv('MONGO_URL', 'mongodb://mongo:27017')
    mongo_user = os.getenv('MONGO_INITDB_ROOT_USERNAME', 'admin')
    mongo_pass = os.getenv('MONGO_INITDB_ROOT_PASSWORD', 'xxx')
    mongo_db = os.getenv('MONGO_INITDB_DATABASE', 'word_db')

    # Build connection string with authentication
    if '@' in mongo_host:
        # Already has credentials in URL
        mongo_uri = mongo_host
    else:
        # Add credentials to URL
        mongo_uri = f"mongodb://{mongo_user}:{mongo_pass}@{mongo_host.split('://')[-1]}/"

    print(f"Connecting to MongoDB: {mongo_uri.replace(mongo_pass, '***')}")

    # MongoDB connection with authentication
    client = MongoClient(mongo_uri)
    db = client[mongo_db]

    # Test connection
    try:
        client.admin.command('ping')
        print("✅ MongoDB connection successful")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        sys.exit(1)

    # Clear existing collection
    db.words.drop()
    print("Cleared existing words collection")

    # Step 1: Build word set from tab-separated file
    csv_path = '/data/words.csv'
    words_set = set()
    word_definitions = {}

    print("Loading words into memory...")
    with open(csv_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            # Split on first tab only - word is first part, definition is the rest
            parts = line.strip().split('\t', 1)
            if len(parts) < 2:
                continue  # Skip malformed lines

            word = parts[0].upper().strip()
            definition = parts[1].strip()

            words_set.add(word)
            word_definitions[word] = definition

            if i % 50000 == 0:
                print(f"  Loaded {i} words...")

    print(f"Loaded {len(words_set)} words for hook calculation")

    # Step 2: Process and insert in batches
    batch_docs = []
    batch_size = 5000

    with open(csv_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            parts = line.strip().split('\t', 1)
            if len(parts) < 2:
                continue

            word = parts[0].upper().strip()
            definition = parts[1].strip()

            doc = {
                'word': word,
                'definition': definition,
                'front_hooks': calculate_front_hooks(word, words_set),
                'back_hooks': calculate_back_hooks(word, words_set),
                'alphagram': ''.join(sorted(word))
            }
            batch_docs.append(doc)

            if len(batch_docs) >= batch_size:
                db.words.insert_many(batch_docs)
                batch_docs = []
                print(f"Processed {i + 1} words...")

    # Final batch
    if batch_docs:
        db.words.insert_many(batch_docs)

    print(f"Completed! Loaded {i + 1} words into MongoDB")

    # Create indexes for performance
    print("Creating indexes...")
    db.words.create_index('word')
    db.words.create_index('alphagram')
    print("Indexes created")

if __name__ == '__main__':
    load_words()
