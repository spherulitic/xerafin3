from flask import request
import linecache
import os, sys, traceback
import time
from datetime import datetime
from sloth import app

def debug(message):
  app.logger.info("{} {} {}\n".format(__name__, datetime.now().strftime("%Y %m %d %H:%M:%S"), message))
