import os
import time
from datetime import datetime
from . import app

def debug(message):
  timestamp = datetime.now().strftime("%Y %m %d %H:%M:%S")
  app.logger.info(f"{__name__} {timestamp} {message}\n")
