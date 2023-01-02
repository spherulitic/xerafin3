''' General utilities used by each service '''
from datetime import datetime
from cardbox import app

def debug(message):
  ''' Print a debug message to the log file '''
  timestamp = datetime.now().strftime('%Y %m %d %H:%M:%S')
  app.logger.info(f"{__name__} {timestamp} {message}\n")
