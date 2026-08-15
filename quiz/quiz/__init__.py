from flask import Flask, jsonify

app = Flask(__name__)

from xerafinUtil import xerafinUtil as xu

@app.errorhandler(xu.DownstreamError)
def handle_downstream_error(e):
  return jsonify(e.body), e.status_code

from quiz import views

if __name__ == "__main__":
  app.run(debug=True)
