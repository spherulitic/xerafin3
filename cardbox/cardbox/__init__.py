'''Xerafin service containing cardbox functionality'''

from flask import Flask
from flask_oidc import OpenIDConnect

app = Flask(__name__)
oidc = OpenIDConnect(app)

if __name__ == "__main__":
  app.run(debug=True)

from cardbox import views, xerafinLib
