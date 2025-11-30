'''Xerafin service to access the lexicon DB table'''
#!/usr/bin/env python3

try:
  from flask import Flask
  print("✓ Flask imported")
except ImportError as e:
  print(f"✗ Flask import failed: {e}")

# Rest of your Flask app...

app = Flask(__name__)

if __name__ == "__main__":
  app.run(debug=True)

from lexicon import views
