''' General utilities used by each service '''
from datetime import datetime
from cardbox import app

def debug(message):
  ''' Print a debug message to the log file '''
  timestamp = datetime.now().strftime('%Y %m %d %H:%M:%S')
  app.logger.info(f"{__name__} {timestamp} {message}\n")

class DownstreamError(Exception):
  '''Raised when a downstream service returns an error we must propagate
     (e.g. a 401) back to the client, which will refresh its token and retry.'''
  def __init__(self, status_code, body):
    super().__init__(f"Downstream service returned {status_code}: {body}")
    self.status_code = status_code
    self.body = body

def check401(response):
  '''Pass through non-401 responses; otherwise raise DownstreamError with the
     downstream error body so the 401 propagates to the client.'''
  if response.status_code == 401:
    try:
      body = response.json()
    except Exception:
      body = {'error': 'Unauthorized'}
    raise DownstreamError(401, body)
  return response
