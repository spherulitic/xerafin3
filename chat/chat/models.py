from . import db
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

class Chat(db.Model):
  userid: Mapped[str] = mapped_column(String, primary_key=True)
  timeStamp: Mapped[int] = mapped_column(Integer, primary_key=True)
  message: Mapped[str] = mapped_column(String)
  milestoneType: Mapped[str] = mapped_column(String)
  milestoneOf: Mapped[str] = mapped_column(String)
