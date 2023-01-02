'''Xerafin service containing cardbox functionality'''

from flask import Flask
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 # 10mb limit

if __name__ == "__main__":
  app.run(debug=True)

from cardbox import views, xerafinLib
