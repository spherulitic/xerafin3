import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
  pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)

# set up database connection

MYSQL_USER = os.environ.get('MYSQL_USER')
MYSQL_DB = os.environ.get('MYSQL_DB')
MYSQL_PWD = os.environ.get('MYSQL_PWD')
MYSQL_HOST = os.environ.get('MYSQL_HOST')
MYSQL_PORT = os.environ.get('MYSQL_PORT')

app.config["SQLALCHEMY_DATABASE_URI"] = f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PWD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
db.init_app(app)

from .models import Chat
from . import views

if __name__ == "__main__":
  app.run(debug=True)
