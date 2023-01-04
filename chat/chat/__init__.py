from flask import Flask

app = Flask(__name__)

from chat import views

if __name__ == "__main__":
  app.run(debug=True)
