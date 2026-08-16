'''Xerafin service containing cardbox functionality'''

from flask import Flask, jsonify
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 # 10mb limit

from xerafinUtil import xerafinUtil as xu

@app.errorhandler(xu.DownstreamError)
def handle_downstream_error(e):
  return jsonify(e.body), e.status_code

if __name__ == "__main__":
  app.run(debug=True)

from cardbox import views, xerafinLib
