'''Xerafin service to manage sloth game states'''
#!/usr/bin/env python3

try:
    from flask import Flask
    print("✓ Flask imported")
except ImportError as e:
    print(f"✗ Flask import failed: {e}")

# Rest of your Flask app...

app = Flask(__name__)

from flask import jsonify
from xerafinUtil import xerafinUtil as xu

@app.errorhandler(xu.DownstreamError)
def handle_downstream_error(e):
  return jsonify(e.body), e.status_code

if __name__ == "__main__":
  app.run(debug=True)

from sloth import views
