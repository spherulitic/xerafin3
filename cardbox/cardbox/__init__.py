'''Xerafin service containing cardbox functionality'''

from flask import Flask
from cardbox import views

app = Flask(__name__)

if __name__ == "__main__":
  app.run(debug=True)
